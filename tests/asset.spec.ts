import { test, expect, APIRequestContext } from "@playwright/test";
import { env } from "../src/config/env";
import { AssetStatus } from "@prisma/client";
import { ASSET_ERROR } from "../src/middleware/assetMiddleware";
import { genId } from "./utils/idGenerator";

const baseUrl = `http://${env.DOMAIN}:${env.PORT}/api/v1`;

const createAuxAssetCategory = async (request: APIRequestContext) => {
    const name = `CAT_AUX_${Date.now().toString().slice(-6)}`;
    const res = await request.post(`${baseUrl}/asset-categories`, {
        data: { id: genId(), name, description: "Categoria auxiliar" },
    });
    expect(res.status()).toBe(200);
    const { data } = await res.json();
    return data;
};

const createAuxAsset = async (request: APIRequestContext) => {
    const category = await createAuxAssetCategory(request);
    const name = `ASSET_${Date.now().toString().slice(-6)}`;
    const payload = {
        id: genId(),
        categoryId: category.id,
        name,
        acquisitionDate: new Date().toISOString(),
        acquisitionCost: 10000,
        usefulLifeMonths: 60,
        salvageValue: 1000,
        location: "Local teste",
        status: AssetStatus.ACTIVE,
        notes: "Ativo criado via teste",
    };

    const res = await request.post(`${baseUrl}/assets`, { data: payload });
    expect(res.status()).toBe(200);
    const { data } = await res.json();
    return data;
};

test("Lista assets com paginacao basica", async ({ request }) => {
    const res = await request.get(`${baseUrl}/assets`);
    expect(res.status()).toBe(200);
    const { data } = await res.json();

    expect(Array.isArray(data.assets)).toBeTruthy();
    expect(typeof data.meta.total).toBe("number");
    expect(data.meta.page).toBe(1);
    expect(data.assets.length).toBeLessThanOrEqual(10);
});

test("Validacao de query: page/limit invalidos em assets", async ({ request }) => {
    const res = await request.get(`${baseUrl}/assets?page=abc&limit=xyz`);
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.message).toContain(ASSET_ERROR.PAGINATION);
});

test("Cria, busca e atualiza asset", async ({ request }) => {
    const asset = await createAuxAsset(request);

    const getRes = await request.get(`${baseUrl}/assets/${asset.id}`);
    expect(getRes.status()).toBe(200);
    const { data: fetched } = await getRes.json();
    expect(fetched).toBeTruthy();
    expect(fetched.id).toBe(asset.id);

    const updateRes = await request.put(`${baseUrl}/assets/${asset.id}`, {
        data: {
            categoryId: asset.categoryId,
            name: `${asset.name}_UPD`,
            acquisitionDate: new Date().toISOString(),
            acquisitionCost: 12000,
            usefulLifeMonths: 72,
            salvageValue: 1500,
            location: "Local atualizado",
            status: AssetStatus.ACTIVE,
            notes: "Ativo atualizado via teste",
        },
    });
    expect(updateRes.status()).toBe(200);
    const { data: updated } = await updateRes.json();
    expect(updated.name).toBe(`${asset.name}_UPD`);
    expect(Number(updated.acquisitionCost)).toBeCloseTo(12000, 6);
});

test("Criar asset sem campos obrigatorios deve falhar (400)", async ({ request }) => {
    const res = await request.post(`${baseUrl}/assets`, {
        data: {
            name: "Ativo incompleto",
        },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.message).toContain(ASSET_ERROR.MISSING_FIELDS);
});

test("Criar asset com valores invalidos deve falhar (400)", async ({ request }) => {
    const category = await createAuxAssetCategory(request);
    const res = await request.post(`${baseUrl}/assets`, {
        data: {
            categoryId: category.id,
            name: "Ativo invalido",
            acquisitionDate: "data-invalida",
            acquisitionCost: -10,
            usefulLifeMonths: 0,
            salvageValue: -5,
        },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.message).toContain(ASSET_ERROR.WRONG_FIELD_VALUE);
});

test("Criar asset com status invalido deve falhar (400)", async ({ request }) => {
    const category = await createAuxAssetCategory(request);
    const res = await request.post(`${baseUrl}/assets`, {
        data: {
            categoryId: category.id,
            name: "Ativo status invalido",
            acquisitionDate: new Date().toISOString(),
            acquisitionCost: 5000,
            usefulLifeMonths: 24,
            salvageValue: 500,
            status: "INVALID",
        },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.message).toContain(ASSET_ERROR.WRONG_FIELD_VALUE);
});

test("Criar asset com categoryId inexistente deve falhar (404)", async ({ request }) => {
    const res = await request.post(`${baseUrl}/assets`, {
        data: {
            categoryId: 9999999,
            name: "Ativo categoria inexistente",
            acquisitionDate: new Date().toISOString(),
            acquisitionCost: 5000,
            usefulLifeMonths: 24,
            salvageValue: 500,
        },
    });
    expect(res.status()).toBe(404);
});

test("Buscar asset por id inexistente retorna 404", async ({ request }) => {
    const res = await request.get(`${baseUrl}/assets/-9999999`);
    expect(res.status()).toBe(404);
    const body = await res.json();
    expect(body.error).toBeTruthy();
});

test("Atualizar asset inexistente retorna 404", async ({ request }) => {
    const category = await createAuxAssetCategory(request);
    const res = await request.put(`${baseUrl}/assets/9999999`, {
        data: {
            categoryId: category.id,
            name: "Inexistente",
            acquisitionDate: new Date().toISOString(),
            acquisitionCost: 5000,
            usefulLifeMonths: 24,
            salvageValue: 500,
        },
    });
    expect(res.status()).toBe(404);
});

test("Atualizar asset com categoryId inexistente deve falhar (404)", async ({ request }) => {
    const asset = await createAuxAsset(request);

    const res = await request.put(`${baseUrl}/assets/${asset.id}`, {
        data: {
            categoryId: 9999999,
            name: asset.name,
            acquisitionDate: new Date().toISOString(),
            acquisitionCost: asset.acquisitionCost,
            usefulLifeMonths: asset.usefulLifeMonths,
            salvageValue: asset.salvageValue,
            location: asset.location,
            status: asset.status,
            notes: asset.notes,
        },
    });
    expect(res.status()).toBe(404);
});

test("Atualizar asset com status invalido deve falhar (400)", async ({ request }) => {
    const asset = await createAuxAsset(request);

    const res = await request.put(`${baseUrl}/assets/${asset.id}`, {
        data: {
            categoryId: asset.categoryId,
            name: asset.name,
            acquisitionDate: new Date().toISOString(),
            acquisitionCost: asset.acquisitionCost,
            usefulLifeMonths: asset.usefulLifeMonths,
            salvageValue: asset.salvageValue,
            location: asset.location,
            status: "INVALID",
            notes: asset.notes,
        },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.message).toContain(ASSET_ERROR.WRONG_FIELD_VALUE);
});
