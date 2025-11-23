import { test, expect } from "@playwright/test";
import { env } from "../src/config/env";
import { PURCHASE_ORDER_ERROR } from "../src/middleware/purchaseOrder.middleware";
import { OrderStatus } from "@prisma/client";
import { genId } from "./utils/idGenerator";

const baseUrl = `http://${env.DOMAIN}:${env.PORT}/api/v1`;

test("Lista compras e valida paginação", async ({ request }) => {
    const res = await request.get(`${baseUrl}/purchase-orders`);
    expect(res.status()).toBe(200);
    const { data } = await res.json();
    expect(Array.isArray(data.items)).toBeTruthy();
});

test("Filtro status inválido deve retornar 400", async ({ request }) => {
    const res = await request.get(`${baseUrl}/purchase-orders?status=INVALID`);
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.message).toContain(PURCHASE_ORDER_ERROR.INVALID_STATUS);
});

test("Cria, busca e atualiza compra", async ({ request }) => {
    const supRes = await request.get(`${baseUrl}/suppliers?includeInactive=true`);
    expect(supRes.status()).toBe(200);
    const { data: slist } = await supRes.json();
    const supplier = slist.items[0];
    expect(supplier).toBeTruthy();

    const code = `PO${Date.now().toString().slice(-6)}`;
    const createRes = await request.post(`${baseUrl}/purchase-orders`, {
        data: { id: genId(), code, supplierId: supplier.id, notes: null },
    });
    expect(createRes.status()).toBe(200);
    const { data: created } = await createRes.json();
    expect(created.code).toBe(code);

    const getRes = await request.get(`${baseUrl}/purchase-orders/${created.id}`);
    expect(getRes.status()).toBe(200);
    const { data: fetched } = await getRes.json();
    expect(fetched.id).toBe(created.id);

    const updRes = await request.put(`${baseUrl}/purchase-orders/${created.id}`, {
        data: {
            status: OrderStatus.RECEIVED,
            notes: "Recebida",
            supplierId: fetched.supplierId,
            code: fetched.code,
        },
    });
    expect(updRes.status()).toBe(200);
    const { data: updated } = await updRes.json();
    expect(updated.status).toBe(OrderStatus.RECEIVED);
});

test("Criar compra com code duplicado retorna 409", async ({ request }) => {
    const supRes = await request.get(`${baseUrl}/suppliers?includeInactive=true`);
    const { data: slist } = await supRes.json();
    const supplier = slist.items[0];

    const code = `POD${Date.now().toString().slice(-6)}`;
    const res1 = await request.post(`${baseUrl}/purchase-orders`, {
        data: { id: genId(), code, supplierId: supplier.id },
    });
    expect(res1.status()).toBe(200);
    const res2 = await request.post(`${baseUrl}/purchase-orders`, {
        data: { id: genId(), code, supplierId: supplier.id },
    });
    expect(res2.status()).toBe(409);
});

test("Busca compras com search por fornecedor e ordena por code", async ({ request }) => {
    const supRes = await request.get(`${baseUrl}/suppliers?includeInactive=true`);
    expect(supRes.status()).toBe(200);
    const { data: slist } = await supRes.json();
    const supplier = slist.items[0];
    expect(supplier).toBeTruthy();

    const sourceName = supplier.person.name || supplier.person.legalName || supplier.person.taxId;
    expect(sourceName).toBeTruthy();
    const searchTerm = sourceName.slice(0, Math.min(4, sourceName.length));

    const codePrefix = `POSRCH_${Date.now().toString().slice(-4)}`;
    const payloads = [
        { id: genId(), code: `${codePrefix}B`, supplierId: supplier.id, notes: `${codePrefix}B` },
        { id: genId(), code: `${codePrefix}A`, supplierId: supplier.id, notes: `${codePrefix}A` },
    ];

    for (const payload of payloads) {
        const resCreate = await request.post(`${baseUrl}/purchase-orders`, { data: payload });
        expect(resCreate.status()).toBe(200);
    }

    const res = await request.get(
        `${baseUrl}/purchase-orders?search=${encodeURIComponent(searchTerm)}&sortBy=code&sortOrder=asc`
    );
    expect(res.status()).toBe(200);
    const { data } = await res.json();

    const matching = data.items.filter((order: { code: string }) =>
        order.code.startsWith(codePrefix)
    );
    expect(matching.length).toBeGreaterThanOrEqual(2);

    const codes = matching.map((order: { code: string }) => order.code);
    const sorted = [...codes].sort();
    expect(codes).toEqual(sorted);
    expect(
        matching.every((order: { supplier: { person: { name?: string | null } } }) =>
            order.supplier.person.name?.toLowerCase().includes(searchTerm.toLowerCase())
        )
    ).toBeTruthy();
});
