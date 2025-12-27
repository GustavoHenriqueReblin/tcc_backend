import { test, expect, APIRequestContext } from "@playwright/test";
import { env } from "../src/config/env";
import { SALE_ORDER_ITEM_ERROR } from "../src/middleware/saleOrderItem.middleware";
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

const findDefinitionByType = async (request: APIRequestContext, type: ProductDefinitionType) => {
    const res = await request.get(`${baseUrl}/product-definitions?type=${type}`);
    expect(res.status()).toBe(200);
    const { data } = await res.json();
    return data.items.find((pd: { type: ProductDefinitionType }) => pd.type === type) ?? null;
};

const createAuxDefinition = async (request: APIRequestContext) => {
    const existing = await findDefinitionByType(request, ProductDefinitionType.FINISHED_PRODUCT);
    if (existing) return existing;

    const name = `PD_${Date.now().toString().slice(-6)}`;
    const res = await request.post(`${baseUrl}/product-definitions`, {
        data: {
            id: genId(),
            name,
            description: "Aux",
            type: ProductDefinitionType.FINISHED_PRODUCT,
        },
    });
    expect(res.status()).toBe(200);
    const { data } = await res.json();
    return data;
};

const createAuxProduct = async (request: APIRequestContext, namePrefix = "PROD_SOI") => {
    const unity = await createAuxUnity(request);
    const def = await createAuxDefinition(request);
    const nameBase = `${namePrefix}_${Date.now().toString().slice(-6)}`;
    const payload = {
        id: genId(),
        productDefinitionId: def.id,
        unityId: unity.id,
        name: nameBase,
        barcode: null,
        inventory: { costValue: 3.33, saleValue: 6.66, quantity: 5 },
    };
    const res = await request.post(`${baseUrl}/products`, { data: payload });
    expect(res.status()).toBe(200);
    const { data } = await res.json();
    return data;
};

const createSaleOrder = async (request: APIRequestContext) => {
    const custRes = await request.get(`${baseUrl}/customers`);
    const { data: clist } = await custRes.json();
    const customer = clist.items[0];
    const code = `SOI${Date.now().toString().slice(-6)}`;
    const res = await request.post(`${baseUrl}/sale-orders`, {
        data: { id: genId(), code, customerId: customer.id, totalValue: 0 },
    });
    expect(res.status()).toBe(200);
    const { data } = await res.json();
    return data;
};

test("Lista itens de pedido de venda e valida filtro opcional", async ({ request }) => {
    const res = await request.get(`${baseUrl}/sale-order-items`);
    expect(res.status()).toBe(200);
    const { data } = await res.json();
    expect(Array.isArray(data.items)).toBeTruthy();
});

test("Filtro saleOrderId inválido retorna 400", async ({ request }) => {
    const res = await request.get(`${baseUrl}/sale-order-items?saleOrderId=abc`);
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.message).toContain(SALE_ORDER_ITEM_ERROR.INVALID_ORDER);
});

test("Cria, busca e atualiza item do pedido de venda", async ({ request }) => {
    const order = await createSaleOrder(request);
    const product = await createAuxProduct(request);

    const createRes = await request.post(`${baseUrl}/sale-order-items`, {
        data: {
            id: genId(),
            saleOrderId: order.id,
            productId: product.id,
            quantity: 3.5,
            unitPrice: 7.77,
            productUnitPrice: 7.77,
            unitCost: 3.77,
        },
    });
    expect(createRes.status()).toBe(200);
    const { data: created } = await createRes.json();
    expect(created.saleOrderId).toBe(order.id);

    const getRes = await request.get(`${baseUrl}/sale-order-items/${created.id}`);
    expect(getRes.status()).toBe(200);
    const { data: fetched } = await getRes.json();
    expect(fetched.id).toBe(created.id);

    const updRes = await request.put(`${baseUrl}/sale-order-items/${created.id}`, {
        data: {
            quantity: 4.25,
            unitPrice: 8.11,
            saleOrderId: fetched.saleOrderId,
            productId: fetched.productId,
            productUnitPrice: fetched.productUnitPrice,
            unitCost: fetched.unitCost,
        },
    });
    expect(updRes.status()).toBe(200);
    const { data: updated } = await updRes.json();
    expect(Number(updated.quantity)).toBeCloseTo(4.25, 4);
});

test("Criar item sem campos obrigatórios deve falhar (400)", async ({ request }) => {
    const res = await request.post(`${baseUrl}/sale-order-items`, { data: { id: genId() } });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.message).toContain(SALE_ORDER_ITEM_ERROR.MISSING_FIELDS);
});

test("Busca itens de pedido de venda com search por produto e ordena por unitPrice", async ({
    request,
}) => {
    const order = await createSaleOrder(request);
    const searchTerm = `SOI_SEARCH_${Date.now().toString().slice(-4)}`;
    const productA = await createAuxProduct(request, `${searchTerm}B`);
    const productB = await createAuxProduct(request, `${searchTerm}A`);

    const payloads = [
        {
            id: genId(),
            saleOrderId: order.id,
            productId: productA.id,
            quantity: 1.5,
            unitPrice: 12.5,
            productUnitPrice: 12.5,
            unitCost: 6.25,
        },
        {
            id: genId(),
            saleOrderId: order.id,
            productId: productB.id,
            quantity: 2,
            unitPrice: 8.75,
            productUnitPrice: 8.75,
            unitCost: 4.5,
        },
    ];

    for (const payload of payloads) {
        const resCreate = await request.post(`${baseUrl}/sale-order-items`, { data: payload });
        expect(resCreate.status()).toBe(200);
    }

    const res = await request.get(
        `${baseUrl}/sale-order-items?search=${searchTerm}&sortBy=unitPrice&sortOrder=asc`
    );
    expect(res.status()).toBe(200);
    const { data } = await res.json();

    const matching = data.items.filter(
        (item: { product: { name: string } }) =>
            item.product.name.includes(searchTerm) || item.code?.includes(searchTerm)
    );
    expect(matching.length).toBeGreaterThanOrEqual(2);

    const prices = matching.map((item: { unitPrice: string }) => Number(item.unitPrice));
    const sorted = [...prices].sort((a, b) => a - b);
    expect(prices).toEqual(sorted);
});
