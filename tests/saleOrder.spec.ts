import { test, expect } from "@playwright/test";
import { env } from "../src/config/env";
import { SALE_ORDER_ERROR } from "../src/middleware/saleOrder.middleware";
import { OrderStatus } from "@prisma/client";
import { genId } from "./utils/idGenerator";

const baseUrl = `http://${env.DOMAIN}:${env.PORT}/api/v1`;

test("Lista pedidos de venda e valida paginação", async ({ request }) => {
    const res = await request.get(`${baseUrl}/sale-orders`);
    expect(res.status()).toBe(200);
    const { data } = await res.json();
    expect(Array.isArray(data.orders)).toBeTruthy();
    expect(typeof data.meta.total).toBe("number");
});

test("Filtro status inválido deve retornar 400", async ({ request }) => {
    const res = await request.get(`${baseUrl}/sale-orders?status=INVALID`);
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.message).toContain(SALE_ORDER_ERROR.INVALID_STATUS);
});

test("Cria, busca e atualiza pedido de venda", async ({ request }) => {
    const custRes = await request.get(`${baseUrl}/customers`);
    expect(custRes.status()).toBe(200);
    const { data: clist } = await custRes.json();
    const customer = clist.customers[0];
    expect(customer).toBeTruthy();

    const code = `SO${Date.now().toString().slice(-6)}`;
    const createRes = await request.post(`${baseUrl}/sale-orders`, {
        data: { id: genId(), code, customerId: customer.id, totalValue: 100.5, notes: null },
    });
    expect(createRes.status()).toBe(200);
    const { data: created } = await createRes.json();
    expect(created.code).toBe(code);

    const getRes = await request.get(`${baseUrl}/sale-orders/${created.id}`);
    expect(getRes.status()).toBe(200);
    const { data: fetched } = await getRes.json();
    expect(fetched.id).toBe(created.id);

    const updRes = await request.put(`${baseUrl}/sale-orders/${created.id}`, {
        data: {
            status: OrderStatus.APPROVED,
            totalValue: 150.75,
            customerId: fetched.customerId,
            code: fetched.code,
        },
    });
    expect(updRes.status()).toBe(200);
    const { data: updated } = await updRes.json();
    expect(updated.status).toBe(OrderStatus.APPROVED);
});

test("Criar pedido com code duplicado retorna 409", async ({ request }) => {
    const custRes = await request.get(`${baseUrl}/customers`);
    const { data: clist } = await custRes.json();
    const customer = clist.customers[0];

    const code = `SOD${Date.now().toString().slice(-6)}`;
    const res1 = await request.post(`${baseUrl}/sale-orders`, {
        data: { id: genId(), code, customerId: customer.id, totalValue: 10 },
    });
    expect(res1.status()).toBe(200);
    const res2 = await request.post(`${baseUrl}/sale-orders`, {
        data: { id: genId(), code, customerId: customer.id, totalValue: 20 },
    });
    expect(res2.status()).toBe(409);
});

test("Busca pedidos de venda com search e ordena por totalValue", async ({ request }) => {
    const custRes = await request.get(`${baseUrl}/customers`);
    expect(custRes.status()).toBe(200);
    const { data: clist } = await custRes.json();
    const customer = clist.customers[0];
    expect(customer).toBeTruthy();

    const sourceName = customer.person.name || customer.person.legalName || customer.person.taxId;
    expect(sourceName).toBeTruthy();
    const searchTerm = sourceName.slice(0, Math.min(4, sourceName.length));

    const codePrefix = `SOSRCH_${Date.now().toString().slice(-4)}`;
    const payloads = [
        { id: genId(), code: `${codePrefix}B`, customerId: customer.id, totalValue: 75.5 },
        { id: genId(), code: `${codePrefix}A`, customerId: customer.id, totalValue: 12.25 },
    ];

    for (const payload of payloads) {
        const resCreate = await request.post(`${baseUrl}/sale-orders`, { data: payload });
        expect(resCreate.status()).toBe(200);
    }

    const res = await request.get(
        `${baseUrl}/sale-orders?search=${encodeURIComponent(searchTerm)}&sortBy=totalValue&sortOrder=asc`
    );
    expect(res.status()).toBe(200);
    const { data } = await res.json();

    const matching = data.orders.filter((order: { code: string }) =>
        order.code.startsWith(codePrefix)
    );
    expect(matching.length).toBeGreaterThanOrEqual(2);

    const totals = matching.map((order: { totalValue: string }) => Number(order.totalValue));
    const sorted = [...totals].sort((a, b) => a - b);
    expect(totals).toEqual(sorted);
    expect(
        matching.every((order: { customer: { person: { name?: string | null } } }) =>
            order.customer.person.name?.toLowerCase().includes(searchTerm.toLowerCase())
        )
    ).toBeTruthy();
});
