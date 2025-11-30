import { test, expect, APIRequestContext } from "@playwright/test";
import { env } from "../src/config/env";
import { PURCHASE_ORDER_ERROR } from "../src/middleware/purchaseOrder.middleware";
import { OrderStatus, ProductDefinitionType } from "@prisma/client";
import { genId } from "./utils/idGenerator";

const baseUrl = `http://${env.DOMAIN}:${env.PORT}/api/v1`;

const createAuxUnity = async (request: APIRequestContext) => {
    const simbol = `UPO${Math.abs(genId())}`;
    const res = await request.post(`${baseUrl}/unities`, {
        data: { id: genId(), simbol, description: "PO Aux" },
    });
    expect(res.status()).toBe(200);
    const { data } = await res.json();
    return data;
};

const createRawDefinition = async (request: APIRequestContext) => {
    const name = `PD_PO_${Math.abs(genId())}`;
    const res = await request.post(`${baseUrl}/product-definitions`, {
        data: {
            id: genId(),
            name,
            description: "PO Aux",
            type: ProductDefinitionType.RAW_MATERIAL,
        },
    });
    expect(res.status()).toBe(200);
    const { data } = await res.json();
    return data;
};

const createRawProduct = async (request: APIRequestContext, prefix = "RAW_PO") => {
    const unity = await createAuxUnity(request);
    const definition = await createRawDefinition(request);
    const name = `${prefix}_${Math.abs(genId())}`;
    const payload = {
        id: genId(),
        productDefinitionId: definition.id,
        unityId: unity.id,
        name,
        barcode: null,
        inventory: { costValue: 2.5, saleValue: 0, quantity: 100 },
    };
    const res = await request.post(`${baseUrl}/products`, { data: payload });
    expect(res.status()).toBe(200);
    const { data } = await res.json();
    return data;
};

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

test("Cadastra e atualiza itens da compra pela rota principal", async ({ request }) => {
    const supRes = await request.get(`${baseUrl}/suppliers?includeInactive=true`);
    const { data: slist } = await supRes.json();
    const supplier = slist.items[0];
    expect(supplier).toBeTruthy();

    const rawA = await createRawProduct(request, "PO_ITEM_A");
    const rawB = await createRawProduct(request, "PO_ITEM_B");
    const rawC = await createRawProduct(request, "PO_ITEM_C");

    const code = `POITEM${Date.now().toString().slice(-6)}`;
    const createRes = await request.post(`${baseUrl}/purchase-orders`, {
        data: {
            id: genId(),
            code,
            supplierId: supplier.id,
            notes: "Compra com itens",
            items: {
                create: [
                    { productId: rawA.id, quantity: 10, unitCost: 5.75 },
                    { productId: rawB.id, quantity: 4.5, unitCost: 2.1 },
                ],
            },
        },
    });
    expect(createRes.status()).toBe(200);
    const { data: created } = await createRes.json();

    const fetchCreated = await request.get(`${baseUrl}/purchase-orders/${created.id}`);
    const { data: createdFull } = await fetchCreated.json();
    const itemA = createdFull.items.find(
        (item: { productId: number }) => item.productId === rawA.id
    );
    const itemB = createdFull.items.find(
        (item: { productId: number }) => item.productId === rawB.id
    );
    expect(itemA).toBeTruthy();
    expect(itemB).toBeTruthy();

    const updateRes = await request.put(`${baseUrl}/purchase-orders/${created.id}`, {
        data: {
            supplierId: created.supplierId,
            code: created.code,
            items: {
                update: [{ id: itemA.id, quantity: 12.5, unitCost: 6 }],
                delete: [itemB.id],
                create: [{ productId: rawC.id, quantity: 3, unitCost: 8.25 }],
            },
        },
    });
    expect(updateRes.status()).toBe(200);

    const verify = await request.get(`${baseUrl}/purchase-orders/${created.id}`);
    const { data: updated } = await verify.json();
    const updatedItemA = updated.items.find(
        (item: { productId: number }) => item.productId === rawA.id
    );
    const deletedItem = updated.items.find(
        (item: { productId: number }) => item.productId === rawB.id
    );
    const addedItem = updated.items.find(
        (item: { productId: number }) => item.productId === rawC.id
    );

    expect(Number(updatedItemA.quantity)).toBeCloseTo(12.5, 4);
    expect(deletedItem).toBeUndefined();
    expect(addedItem).toBeTruthy();
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
