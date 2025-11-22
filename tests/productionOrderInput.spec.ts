import { test, expect, APIRequestContext } from "@playwright/test";
import { env } from "../src/config/env";
import { PRODUCTION_ORDER_INPUT_ERROR } from "../src/middleware/productionOrderInput.middleware";
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

const createDefinition = async (request: APIRequestContext, type: ProductDefinitionType) => {
    const name = `PD_${type}_${Date.now().toString().slice(-6)}`;
    const res = await request.post(`${baseUrl}/product-definitions`, {
        data: { id: genId(), name, description: "Aux", type },
    });
    expect(res.status()).toBe(200);
    const { data } = await res.json();
    return data;
};

const createProduct = async (
    request: APIRequestContext,
    type: ProductDefinitionType,
    namePrefix: string
) => {
    const unity = await createAuxUnity(request);
    const def = await createDefinition(request, type);
    const nameBase = `${namePrefix}_${Date.now().toString().slice(-6)}`;
    const res = await request.post(`${baseUrl}/products`, {
        data: {
            id: genId(),
            productDefinitionId: def.id,
            unityId: unity.id,
            name: nameBase,
            barcode: null,
            inventory: { costValue: 1.23, saleValue: 2.34, quantity: 5 },
        },
    });
    expect(res.status()).toBe(200);
    const { data } = await res.json();
    return data;
};

const createOrder = async (request: APIRequestContext, productId: number) => {
    const code = `PRODI_${Date.now().toString().slice(-6)}`;
    const res = await request.post(`${baseUrl}/production-orders`, {
        data: { id: genId(), code, productId, plannedQty: 20 },
    });
    expect(res.status()).toBe(200);
    const { data } = await res.json();
    return data;
};

test("Lista insumos da ordem com paginação e filtro opcional", async ({ request }) => {
    const res = await request.get(`${baseUrl}/production-order-inputs`);
    expect(res.status()).toBe(200);
    const { data } = await res.json();
    expect(Array.isArray(data.items)).toBeTruthy();
});

test("Filtro productionOrderId inválido retorna 400", async ({ request }) => {
    const res = await request.get(`${baseUrl}/production-order-inputs?productionOrderId=abc`);
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.message).toContain(PRODUCTION_ORDER_INPUT_ERROR.INVALID_ORDER);
});

test("Cria, busca e atualiza insumo da ordem", async ({ request }) => {
    const prod = await createProduct(request, ProductDefinitionType.FINISHED_PRODUCT, "PFIN");
    const raw = await createProduct(request, ProductDefinitionType.RAW_MATERIAL, "PRAW");
    const order = await createOrder(request, prod.id);

    const createRes = await request.post(`${baseUrl}/production-order-inputs`, {
        data: {
            id: genId(),
            productionOrderId: order.id,
            productId: raw.id,
            quantity: 12.5,
            unitCost: 2.5,
        },
    });
    expect(createRes.status()).toBe(200);
    const { data: created } = await createRes.json();
    expect(created.productionOrderId).toBe(order.id);

    const getRes = await request.get(`${baseUrl}/production-order-inputs/${created.id}`);
    expect(getRes.status()).toBe(200);
    const { data: fetched } = await getRes.json();
    expect(fetched.id).toBe(created.id);

    const updRes = await request.put(`${baseUrl}/production-order-inputs/${created.id}`, {
        data: {
            quantity: 13.75,
            unitCost: 2.75,
            productionOrderId: fetched.productionOrderId,
            productId: fetched.productId,
        },
    });
    expect(updRes.status()).toBe(200);
    const { data: updated } = await updRes.json();
    expect(Number(updated.quantity)).toBeCloseTo(13.75, 4);
});

test("Criar insumo sem campos obrigatórios deve falhar (400)", async ({ request }) => {
    const res = await request.post(`${baseUrl}/production-order-inputs`, { data: { id: genId() } });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.message).toContain(PRODUCTION_ORDER_INPUT_ERROR.MISSING_FIELDS);
});

test("Busca insumos da ordem com search no produto e ordena por unitCost", async ({ request }) => {
    const prod = await createProduct(request, ProductDefinitionType.FINISHED_PRODUCT, "PFIN_SRCH");
    const order = await createOrder(request, prod.id);

    const searchTerm = `POI_SEARCH_${Date.now().toString().slice(-4)}`;
    const raw1 = await createProduct(
        request,
        ProductDefinitionType.RAW_MATERIAL,
        `${searchTerm}_B`
    );
    const raw2 = await createProduct(
        request,
        ProductDefinitionType.RAW_MATERIAL,
        `${searchTerm}_A`
    );

    const payloads = [
        {
            id: genId(),
            productionOrderId: order.id,
            productId: raw1.id,
            quantity: 3,
            unitCost: 5.5,
        },
        {
            id: genId(),
            productionOrderId: order.id,
            productId: raw2.id,
            quantity: 4,
            unitCost: 2.75,
        },
    ];
    for (const payload of payloads) {
        const resCreate = await request.post(`${baseUrl}/production-order-inputs`, {
            data: payload,
        });
        expect(resCreate.status()).toBe(200);
    }

    const res = await request.get(
        `${baseUrl}/production-order-inputs?search=${searchTerm}&sortBy=unitCost&sortOrder=asc`
    );
    expect(res.status()).toBe(200);
    const { data } = await res.json();

    const matching = data.items.filter((item: { product: { name: string } }) =>
        item.product.name.includes(searchTerm)
    );
    expect(matching.length).toBeGreaterThanOrEqual(2);

    const unitCosts = matching.map((item: { unitCost: string | null }) =>
        item.unitCost ? Number(item.unitCost) : 0
    );
    const sorted = [...unitCosts].sort((a, b) => a - b);
    expect(unitCosts).toEqual(sorted);
});
