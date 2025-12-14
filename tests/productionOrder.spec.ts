import { test, expect, APIRequestContext } from "@playwright/test";
import { env } from "../src/config/env";
import { PRODUCTION_ORDER_ERROR } from "../src/middleware/productionOrder.middleware";
import { ProductDefinitionType, ProductionOrderStatus } from "@prisma/client";
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

const createAuxDefinition = async (request: APIRequestContext) => {
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

const createAuxProduct = async (request: APIRequestContext) => {
    const unity = await createAuxUnity(request);
    const def = await createAuxDefinition(request);
    const nameBase = `PROD_PO_${Date.now().toString().slice(-6)}`;
    const payload = {
        id: genId(),
        productDefinitionId: def.id,
        unityId: unity.id,
        name: nameBase,
        barcode: null,
        inventory: { costValue: 4.44, saleValue: 8.88, quantity: 10 },
    };
    const res = await request.post(`${baseUrl}/products`, { data: payload });
    expect(res.status()).toBe(200);
    const { data } = await res.json();
    return data;
};

const createAuxRecipe = async (request: APIRequestContext) => {
    const product = await createAuxProduct(request);
    const res = await request.post(`${baseUrl}/recipes`, {
        data: {
            id: genId(),
            productId: product.id,
            description: "Receita auxiliar para production order",
            notes: null,
        },
    });
    expect(res.status()).toBe(200);
    const { data } = await res.json();
    return { recipe: data, product };
};

test("Lista ordens de produÇõÇœo com paginaÇõÇœo bÇ­sica", async ({ request }) => {
    const res = await request.get(`${baseUrl}/production-orders`);
    expect(res.status()).toBe(200);
    const { data } = await res.json();
    expect(Array.isArray(data.items)).toBeTruthy();
});

test("ValidaÇõÇœo de query: status invÇ­lido", async ({ request }) => {
    const res = await request.get(`${baseUrl}/production-orders?status=INVALID`);
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.message).toContain(PRODUCTION_ORDER_ERROR.INVALID_STATUS);
});

test("ValidaÇõÇœo de id, paginaÇõÇœo e ordenaÇõÇœo de production order", async ({ request }) => {
    const resInvalidId = await request.get(`${baseUrl}/production-orders/not-a-number`);
    expect(resInvalidId.status()).toBe(400);
    const bodyInvalidId = await resInvalidId.json();
    expect(bodyInvalidId.message).toContain(PRODUCTION_ORDER_ERROR.ID);

    const resInvalidPagination = await request.get(
        `${baseUrl}/production-orders?page=abc&limit=xyz`
    );
    expect(resInvalidPagination.status()).toBe(400);
    const bodyInvalidPagination = await resInvalidPagination.json();
    expect(bodyInvalidPagination.message).toContain(PRODUCTION_ORDER_ERROR.PAGINATION);

    const resInvalidSortOrder = await request.get(
        `${baseUrl}/production-orders?sortOrder=ascending`
    );
    expect(resInvalidSortOrder.status()).toBe(400);
    const bodyInvalidSortOrder = await resInvalidSortOrder.json();
    expect(bodyInvalidSortOrder.message).toContain(PRODUCTION_ORDER_ERROR.SORT);

    const resInvalidSortBy = await request.get(`${baseUrl}/production-orders?sortBy=unknown`);
    expect(resInvalidSortBy.status()).toBe(400);
    const bodyInvalidSortBy = await resInvalidSortBy.json();
    expect(bodyInvalidSortBy.message).toContain(PRODUCTION_ORDER_ERROR.SORT_BY);
});

test("Cria, busca e atualiza ordem de produÇõÇœo", async ({ request }) => {
    const { recipe } = await createAuxRecipe(request);
    const code = `PRD${Date.now().toString().slice(-6)}`;
    const createRes = await request.post(`${baseUrl}/production-orders`, {
        data: { id: genId(), code, recipeId: recipe.id, plannedQty: 50.5, notes: null },
    });
    expect(createRes.status()).toBe(200);
    const { data: created } = await createRes.json();
    expect(created.code).toBe(code);
    expect(created.recipeId).toBe(recipe.id);

    const getRes = await request.get(`${baseUrl}/production-orders/${created.id}`);
    expect(getRes.status()).toBe(200);
    const { data: fetched } = await getRes.json();
    expect(fetched.id).toBe(created.id);
    expect(fetched.recipeId).toBe(recipe.id);

    const updRes = await request.put(`${baseUrl}/production-orders/${created.id}`, {
        data: {
            status: ProductionOrderStatus.RUNNING,
            plannedQty: 60,
            code: fetched.code,
            recipeId: fetched.recipeId,
        },
    });
    expect(updRes.status()).toBe(200);
    const { data: updated } = await updRes.json();
    expect(updated.status).toBe(ProductionOrderStatus.RUNNING);
});

test("Busca e ordenaÇõÇœo de production orders por produto", async ({ request }) => {
    const { recipe, product } = await createAuxRecipe(request);
    const code = `PRSRCH${Date.now().toString().slice(-6)}`;

    const createRes = await request.post(`${baseUrl}/production-orders`, {
        data: { id: genId(), code, recipeId: recipe.id, plannedQty: 15.5 },
    });
    expect(createRes.status()).toBe(200);

    const searchTerm = (product.name as string).slice(0, 3);
    const resSearch = await request.get(
        `${baseUrl}/production-orders?search=${encodeURIComponent(searchTerm)}&sortBy=createdAt&sortOrder=asc`
    );
    expect(resSearch.status()).toBe(200);
    const { data: searchData } = await resSearch.json();
    expect(searchData.items.length).toBeGreaterThan(0);

    expect(
        searchData.items.every(
            (order: { recipe: { product: { name: string; barcode?: string | null } } }) =>
                order.recipe.product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                order.recipe.product.barcode?.toLowerCase().includes(searchTerm.toLowerCase())
        )
    ).toBeTruthy();

    const createdDates = searchData.items.map((o: { createdAt: string }) =>
        new Date(o.createdAt).getTime()
    );
    const sortedDates = [...createdDates].sort((a, b) => a - b);
    expect(createdDates).toEqual(sortedDates);
});

test("Criar ordem com code duplicado retorna 409", async ({ request }) => {
    const { recipe } = await createAuxRecipe(request);
    const code = `PDUP${Date.now().toString().slice(-6)}`;
    const res1 = await request.post(`${baseUrl}/production-orders`, {
        data: { id: genId(), code, recipeId: recipe.id, plannedQty: 10 },
    });
    expect(res1.status()).toBe(200);
    const res2 = await request.post(`${baseUrl}/production-orders`, {
        data: { id: genId(), code, recipeId: recipe.id, plannedQty: 11 },
    });
    expect(res2.status()).toBe(409);
});
