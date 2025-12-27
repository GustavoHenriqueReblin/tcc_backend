import { test, expect, APIRequestContext } from "@playwright/test";
import { RECIPE_ERROR } from "../src/middleware/recipe.middleware";
import { ProductDefinitionType } from "@prisma/client";
import { genId } from "./utils/idGenerator";

const baseUrl = `http://localhost:${process.env.PORT ?? "3333"}/api/v1`;

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
    expect(Array.isArray(data.items)).toBeTruthy();
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

test("Cadastra e gerencia itens junto com a receita", async ({ request }) => {
    const recipeProduct = await createAuxProduct(request);
    const componentA = await createAuxProduct(request);
    const componentB = await createAuxProduct(request);
    const componentC = await createAuxProduct(request);

    const createRes = await request.post(`${baseUrl}/recipes`, {
        data: {
            id: genId(),
            productId: recipeProduct.id,
            description: "Receita completa",
            items: {
                create: [
                    { productId: componentA.id, quantity: 1.5 },
                    { productId: componentB.id, quantity: 2.25 },
                ],
            },
        },
    });
    expect(createRes.status()).toBe(200);
    const { data: created } = await createRes.json();

    const getCreated = await request.get(`${baseUrl}/recipes/${created.id}`);
    expect(getCreated.status()).toBe(200);
    const { data: createdFull } = await getCreated.json();

    const itemA = createdFull.items.find(
        (item: { productId: number }) => item.productId === componentA.id
    );
    const itemB = createdFull.items.find(
        (item: { productId: number }) => item.productId === componentB.id
    );
    expect(itemA).toBeTruthy();
    expect(itemB).toBeTruthy();

    const updateRes = await request.put(`${baseUrl}/recipes/${created.id}`, {
        data: {
            productId: created.productId,
            items: {
                update: [{ id: itemA.id, quantity: 3 }],
                delete: [itemB.id],
                create: [{ productId: componentC.id, quantity: 4.5 }],
            },
        },
    });
    expect(updateRes.status()).toBe(200);

    const getUpdated = await request.get(`${baseUrl}/recipes/${created.id}`);
    const { data: updated } = await getUpdated.json();

    const updatedA = updated.items.find(
        (item: { productId: number }) => item.productId === componentA.id
    );
    const removedB = updated.items.find(
        (item: { productId: number }) => item.productId === componentB.id
    );
    const addedC = updated.items.find(
        (item: { productId: number }) => item.productId === componentC.id
    );

    expect(Number(updatedA.quantity)).toBeCloseTo(3, 4);
    expect(removedB).toBeUndefined();
    expect(addedC).toBeTruthy();
});

test("Criar receita sem productId deve falhar (400)", async ({ request }) => {
    const res = await request.post(`${baseUrl}/recipes`, { data: { id: genId() } });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.message).toContain(RECIPE_ERROR.MISSING_FIELDS);
});

test("Busca receitas com search e ordenação por description", async ({ request }) => {
    const product = await createAuxProduct(request);
    const prefix = `REC_SEARCH_${Date.now().toString().slice(-4)}`;

    const payloads = [
        { id: genId(), productId: product.id, description: `${prefix}Z`, notes: "nota 1" },
        {
            id: genId(),
            productId: product.id,
            description: `${prefix}A`,
            notes: `${prefix} nota 2`,
        },
    ];

    for (const payload of payloads) {
        const resCreate = await request.post(`${baseUrl}/recipes`, { data: payload });
        expect(resCreate.status()).toBe(200);
    }

    const res = await request.get(
        `${baseUrl}/recipes?search=${prefix}&sortBy=description&sortOrder=asc`
    );
    expect(res.status()).toBe(200);
    const { data } = await res.json();

    const matching = data.items.filter(
        (recipe: { description?: string | null; code?: string | null }) =>
            recipe.description?.includes(prefix) || recipe.code?.includes(prefix ?? "")
    );
    expect(matching.length).toBeGreaterThanOrEqual(2);

    const descriptions = matching.map(
        (recipe: { description?: string | null }) => recipe.description?.toString() ?? ""
    );
    const sorted = [...descriptions].sort();
    expect(descriptions).toEqual(sorted);
});
