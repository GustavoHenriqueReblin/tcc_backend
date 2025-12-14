import { test, expect, APIRequestContext } from "@playwright/test";
import { env } from "../src/config/env";
import { PURCHASE_ORDER_ITEM_ERROR } from "../src/middleware/purchaseOrderItem.middleware";
import { ProductDefinitionType } from "@prisma/client";
import { genId } from "./utils/idGenerator";

const baseUrl = `http://${env.DOMAIN}:${env.PORT}/api/v1`;

const createAuxUnity = async (request: APIRequestContext) => {
    const simbol = `U${Date.now().toString().slice(-6)}`;
    const res = await request.post(`${baseUrl}/unities`, {
        data: { id: genId(), simbol, description: "Aux" },
    });
    expect(res.status()).toBe(200);
    const { data } = await res.json();
    return data;
};

const createRawDefinition = async (request: APIRequestContext) => {
    const name = `PD_RAW_${Date.now().toString().slice(-6)}`;
    const res = await request.post(`${baseUrl}/product-definitions`, {
        data: {
            id: genId(),
            name,
            description: "Aux",
            type: ProductDefinitionType.RAW_MATERIAL,
        },
    });
    expect(res.status()).toBe(200);
    const { data } = await res.json();
    return data;
};

const createRawProduct = async (request: APIRequestContext, namePrefix = "PROD_POI") => {
    const unity = await createAuxUnity(request);
    const def = await createRawDefinition(request);
    const nameBase = `${namePrefix}_${Date.now().toString().slice(-6)}`;
    const payload = {
        id: genId(),
        productDefinitionId: def.id,
        unityId: unity.id,
        name: nameBase,
        barcode: null,
        inventory: { costValue: 1.11, saleValue: 0, quantity: 100 },
    };
    const res = await request.post(`${baseUrl}/products`, { data: payload });
    expect(res.status()).toBe(200);
    const { data } = await res.json();
    return data;
};

const createAuxWarehouse = async (request: APIRequestContext) => {
    const code = `WH_POI_${Math.abs(genId())}`;
    const res = await request.post(`${baseUrl}/warehouses`, {
        data: { id: genId(), code, name: `Warehouse ${code}`, description: "Aux" },
    });
    expect(res.status()).toBe(200);
    const { data } = await res.json();
    return data;
};

const createPurchaseOrder = async (request: APIRequestContext) => {
    const supRes = await request.get(`${baseUrl}/suppliers?includeInactive=true`);
    const { data: slist } = await supRes.json();
    const supplier = slist.items[0];
    const warehouse = await createAuxWarehouse(request);
    const code = `POI${Date.now().toString().slice(-6)}`;
    const res = await request.post(`${baseUrl}/purchase-orders`, {
        data: {
            id: genId(),
            code,
            supplierId: supplier.id,
            warehouseId: warehouse.id,
            notes: null,
        },
    });
    expect(res.status()).toBe(200);
    const { data } = await res.json();
    return data;
};

test("Lista itens de compra e valida filtro opcional", async ({ request }) => {
    const res = await request.get(`${baseUrl}/purchase-order-items`);
    expect(res.status()).toBe(200);
    const { data } = await res.json();
    expect(Array.isArray(data.items)).toBeTruthy();
});

test("Filtro purchaseOrderId inválido retorna 400", async ({ request }) => {
    const res = await request.get(`${baseUrl}/purchase-order-items?purchaseOrderId=abc`);
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.message).toContain(PURCHASE_ORDER_ITEM_ERROR.INVALID_ORDER);
});

test("Cria, busca e atualiza item da compra", async ({ request }) => {
    const order = await createPurchaseOrder(request);
    const raw = await createRawProduct(request);

    const createRes = await request.post(`${baseUrl}/purchase-order-items`, {
        data: {
            id: genId(),
            purchaseOrderId: order.id,
            productId: raw.id,
            quantity: 25.5,
            unitCost: 1.75,
        },
    });
    expect(createRes.status()).toBe(200);
    const { data: created } = await createRes.json();
    expect(created.purchaseOrderId).toBe(order.id);

    const getRes = await request.get(`${baseUrl}/purchase-order-items/${created.id}`);
    expect(getRes.status()).toBe(200);
    const { data: fetched } = await getRes.json();
    expect(fetched.id).toBe(created.id);

    const updRes = await request.put(`${baseUrl}/purchase-order-items/${created.id}`, {
        data: {
            quantity: 30,
            unitCost: 1.99,
            purchaseOrderId: fetched.purchaseOrderId,
            productId: fetched.productId,
        },
    });
    expect(updRes.status()).toBe(200);
    const { data: updated } = await updRes.json();
    expect(Number(updated.quantity)).toBeCloseTo(30, 3);
});

test("Criar item sem campos obrigatórios deve falhar (400)", async ({ request }) => {
    const res = await request.post(`${baseUrl}/purchase-order-items`, { data: { id: genId() } });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.message).toContain(PURCHASE_ORDER_ITEM_ERROR.MISSING_FIELDS);
});

test("Busca itens de compra com search por produto e ordena por unitCost", async ({ request }) => {
    const order = await createPurchaseOrder(request);
    const searchTerm = `POITEM_SEARCH_${Date.now().toString().slice(-4)}`;
    const raw1 = await createRawProduct(request, `${searchTerm}B`);
    const raw2 = await createRawProduct(request, `${searchTerm}A`);

    const payloads = [
        {
            id: genId(),
            purchaseOrderId: order.id,
            productId: raw1.id,
            quantity: 11,
            unitCost: 3.75,
        },
        {
            id: genId(),
            purchaseOrderId: order.id,
            productId: raw2.id,
            quantity: 7.5,
            unitCost: 1.95,
        },
    ];
    for (const payload of payloads) {
        const resCreate = await request.post(`${baseUrl}/purchase-order-items`, { data: payload });
        expect(resCreate.status()).toBe(200);
    }

    const res = await request.get(
        `${baseUrl}/purchase-order-items?search=${searchTerm}&sortBy=unitCost&sortOrder=asc`
    );
    expect(res.status()).toBe(200);
    const { data } = await res.json();

    const matching = data.items.filter(
        (item: { product: { name: string } }) =>
            item.product.name.includes(searchTerm) || item.code?.includes(searchTerm)
    );
    expect(matching.length).toBeGreaterThanOrEqual(2);

    const costs = matching.map((item: { unitCost: string }) => Number(item.unitCost));
    const sorted = [...costs].sort((a, b) => a - b);
    expect(costs).toEqual(sorted);
});
