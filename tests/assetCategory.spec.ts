import { test, expect } from "@playwright/test";
import { env } from "../src/config/env";
import { ASSET_CATEGORY_ERROR } from "../src/middleware/assetCategoryMiddleware";
import { genId } from "./utils/idGenerator";

const baseUrl = `http://${env.DOMAIN}:${env.PORT}/api/v1`;

test("Lista categorias de ativos com paginacao basica", async ({ request }) => {
    const res = await request.get(`${baseUrl}/asset-categories`);
    expect(res.status()).toBe(200);
    const { data } = await res.json();

    expect(Array.isArray(data.assetCategories)).toBeTruthy();
    expect(typeof data.meta.total).toBe("number");
    expect(data.meta.page).toBe(1);
    expect(data.assetCategories.length).toBeLessThanOrEqual(10);
});

test("Validacao de query: page/limit invalidos em asset-categories", async ({ request }) => {
    const res = await request.get(`${baseUrl}/asset-categories?page=abc&limit=xyz`);
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.message).toContain(ASSET_CATEGORY_ERROR.PAGINATION);
});

test("Cria, busca e atualiza categoria de ativo", async ({ request }) => {
    const uniqueName = `CAT_${Date.now().toString().slice(-6)}`;
    const payload = {
        id: genId(),
        name: uniqueName,
        description: "Categoria de ativo de teste",
    };

    const createRes = await request.post(`${baseUrl}/asset-categories`, { data: payload });
    expect(createRes.status()).toBe(200);
    const { data: created } = await createRes.json();
    expect(created).toBeTruthy();
    expect(created.name).toBe(uniqueName);

    const getRes = await request.get(`${baseUrl}/asset-categories/${created.id}`);
    expect(getRes.status()).toBe(200);
    const { data: fetched } = await getRes.json();
    expect(fetched).toBeTruthy();
    expect(fetched.id).toBe(created.id);

    const updateRes = await request.put(`${baseUrl}/asset-categories/${created.id}`, {
        data: { name: `${uniqueName}_UPD`, description: null },
    });
    expect(updateRes.status()).toBe(200);
    const { data: updated } = await updateRes.json();
    expect(updated.name).toBe(`${uniqueName}_UPD`);
    expect(updated.description).toBeNull();
});

test("Criar categoria de ativo com nome duplicado retorna 409", async ({ request }) => {
    const uniqueName = `CATD_${Date.now().toString().slice(-6)}`;
    const res1 = await request.post(`${baseUrl}/asset-categories`, {
        data: { id: genId(), name: uniqueName, description: null },
    });
    expect(res1.status()).toBe(200);

    const res2 = await request.post(`${baseUrl}/asset-categories`, {
        data: { id: genId(), name: uniqueName, description: "Outra" },
    });
    expect(res2.status()).toBe(409);
    const body = await res2.json();
    expect(body.error).toBeTruthy();
});

test("Buscar categoria de ativo por id inexistente retorna 404", async ({ request }) => {
    const res = await request.get(`${baseUrl}/asset-categories/-9999999`);
    expect(res.status()).toBe(404);
    const body = await res.json();
    expect(body.error).toBeTruthy();
});

test("Atualizar categoria de ativo inexistente retorna 404", async ({ request }) => {
    const res = await request.put(`${baseUrl}/asset-categories/9999999`, {
        data: { name: "Inexistente", description: null },
    });
    expect(res.status()).toBe(404);
    const body = await res.json();
    expect(body.error).toBeTruthy();
});

test("Criar categoria de ativo sem campos obrigatorios deve falhar (400)", async ({ request }) => {
    const res = await request.post(`${baseUrl}/asset-categories`, {
        data: { description: "Sem nome" },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.message).toContain(ASSET_CATEGORY_ERROR.MISSING_FIELDS);
});
