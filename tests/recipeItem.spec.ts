import { test, expect, APIRequestContext } from "@playwright/test";
import { env } from "../src/config/env";
import { RECIPE_ITEM_ERROR } from "../src/middleware/recipeItem.middleware";
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

test("Lista itens de receita e valida filtro opcional", async ({ request }) => {
    const res = await request.get(`${baseUrl}/recipe-items`);
    expect(res.status()).toBe(200);
    const { data } = await res.json();
    expect(Array.isArray(data.items)).toBeTruthy();
});

test("Filtro recipeId inválido deve retornar 400", async ({ request }) => {
    const res = await request.get(`${baseUrl}/recipe-items?recipeId=abc`);
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.message).toContain(RECIPE_ITEM_ERROR.INVALID_RECIPE);
});

test("Cria item de receita, busca e atualiza", async ({ request }) => {
    const prodFinished = await createProduct(
        request,
        ProductDefinitionType.FINISHED_PRODUCT,
        "PROD_FIN"
    );
    const raw = await createProduct(request, ProductDefinitionType.RAW_MATERIAL, "PROD_RAW");

    const recipeRes = await request.post(`${baseUrl}/recipes`, {
        data: { id: genId(), productId: prodFinished.id, description: "R", notes: null },
    });
    expect(recipeRes.status()).toBe(200);
    const { data: recipe } = await recipeRes.json();

    const createRes = await request.post(`${baseUrl}/recipe-items`, {
        data: { id: genId(), recipeId: recipe.id, productId: raw.id, quantity: 1.5 },
    });
    expect(createRes.status()).toBe(200);
    const { data: created } = await createRes.json();
    expect(created.recipeId).toBe(recipe.id);

    const getRes = await request.get(`${baseUrl}/recipe-items/${created.id}`);
    expect(getRes.status()).toBe(200);
    const { data: fetched } = await getRes.json();
    expect(fetched.id).toBe(created.id);

    const updRes = await request.put(`${baseUrl}/recipe-items/${created.id}`, {
        data: { quantity: 2.25, recipeId: fetched.recipeId, productId: fetched.productId },
    });
    expect(updRes.status()).toBe(200);
    const { data: updated } = await updRes.json();
    expect(Number(updated.quantity)).toBeCloseTo(2.25, 4);
});

test("Criar item sem campos obrigatórios deve falhar (400)", async ({ request }) => {
    const res = await request.post(`${baseUrl}/recipe-items`, { data: { id: genId() } });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.message).toContain(RECIPE_ITEM_ERROR.MISSING_FIELDS);
});
