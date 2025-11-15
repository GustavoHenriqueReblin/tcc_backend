import { test, expect, APIRequestContext } from "@playwright/test";
import { env } from "../src/config/env";
import { RECIPE_ERROR } from "../src/middleware/recipeMiddleware";
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
    const nameBase = `PROD_R_${Date.now().toString().slice(-6)}`;
    const payload = {
        id: genId(),
        productDefinitionId: def.id,
        unityId: unity.id,
        name: nameBase,
        barcode: null,
        inventory: {
            costValue: 3,
            saleValue: 7,
            quantity: 1,
        },
    };
    const res = await request.post(`${baseUrl}/products`, { data: payload });
    expect(res.status()).toBe(200);
    const { data } = await res.json();
    return data;
};

test("Lista receitas com paginação básica", async ({ request }) => {
    const res = await request.get(`${baseUrl}/recipes`);
    expect(res.status()).toBe(200);
    const { data } = await res.json();
    expect(Array.isArray(data.recipes)).toBeTruthy();
    expect(typeof data.meta.total).toBe("number");
    expect(data.meta.page).toBe(1);
});

test("Validação de query: page/limit inválidos", async ({ request }) => {
    const resNumbers = await request.get(`${baseUrl}/recipes?page=abc&limit=xyz`);
    expect(resNumbers.status()).toBe(400);
    const bodyNumbers = await resNumbers.json();
    expect(bodyNumbers.message).toContain(RECIPE_ERROR.PAGINATION);
});

test("Cria receita, busca e atualiza", async ({ request }) => {
    const product = await createAuxProduct(request);
    const createRes = await request.post(`${baseUrl}/recipes`, {
        data: { id: genId(), productId: product.id, description: "Receita de teste", notes: null },
    });
    expect(createRes.status()).toBe(200);
    const { data: created } = await createRes.json();
    expect(created.productId).toBe(product.id);

    const getRes = await request.get(`${baseUrl}/recipes/${created.id}`);
    expect(getRes.status()).toBe(200);
    const { data: fetched } = await getRes.json();
    expect(fetched.id).toBe(created.id);

    const updateRes = await request.put(`${baseUrl}/recipes/${created.id}`, {
        data: { description: "Receita atualizada", notes: "n/a", productId: fetched.productId },
    });
    const { data: updated } = await updateRes.json();
    expect(updateRes.status()).toBe(200);
    expect(updated.description).toBe("Receita atualizada");
});

test("Criar receita sem productId deve falhar (400)", async ({ request }) => {
    const res = await request.post(`${baseUrl}/recipes`, { data: { id: genId() } });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.message).toContain(RECIPE_ERROR.MISSING_FIELDS);
});
