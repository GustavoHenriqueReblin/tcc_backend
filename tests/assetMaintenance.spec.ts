import { test, expect, APIRequestContext } from "@playwright/test";
import { env } from "../src/config/env";
import { AssetMaintenance, AssetMaintenanceType, AssetStatus } from "@prisma/client";
import { ASSET_MAINTENANCE_ERROR } from "../src/middleware/assetMaintenance.middleware";
import { genId } from "./utils/idGenerator";

const baseUrl = `http://localhost:${env.PORT}/api/v1`;

const createAuxAssetCategory = async (request: APIRequestContext) => {
    const name = `CAT_AM_${Date.now().toString().slice(-6)}`;
    const res = await request.post(`${baseUrl}/asset-categories`, {
        data: { id: genId(), name, description: "Categoria para manutencao" },
    });
    expect(res.status()).toBe(200);
    const { data } = await res.json();
    return data;
};

const createAuxAsset = async (request: APIRequestContext) => {
    const category = await createAuxAssetCategory(request);
    const name = `ASSET_AM_${Date.now().toString().slice(-6)}`;
    const payload = {
        id: genId(),
        categoryId: category.id,
        name,
        acquisitionDate: new Date().toISOString(),
        acquisitionCost: 8000,
        usefulLifeMonths: 48,
        salvageValue: 800,
        location: "Area de testes",
        status: AssetStatus.ACTIVE,
        notes: "Ativo para testes de manutencao",
    };

    const res = await request.post(`${baseUrl}/assets`, { data: payload });
    expect(res.status()).toBe(200);
    const { data } = await res.json();
    return data;
};

const createAuxMaintenance = async (request: APIRequestContext) => {
    const asset = await createAuxAsset(request);
    const payload = {
        id: genId(),
        assetId: asset.id,
        type: AssetMaintenanceType.PREVENTIVE,
        description: "Manutencao preventiva inicial",
        cost: 500,
        date: new Date().toISOString(),
        technician: "Tecnico Teste",
        notes: "Criada via teste automatizado",
    };

    const res = await request.post(`${baseUrl}/asset-maintenance`, { data: payload });
    expect(res.status()).toBe(200);
    const { data } = await res.json();
    return data;
};

test("Lista manutencoes de ativos com paginacao basica", async ({ request }) => {
    const res = await request.get(`${baseUrl}/asset-maintenance`);
    expect(res.status()).toBe(200);
    const { data } = await res.json();

    expect(Array.isArray(data.items)).toBeTruthy();
    expect(typeof data.meta.total).toBe("number");
    expect(data.meta.page).toBe(1);
    expect(data.items.length).toBeLessThanOrEqual(10);
});

test("Lista manutencoes filtrando por assetId retorna subconjunto", async ({ request }) => {
    const allRes = await request.get(`${baseUrl}/asset-maintenance`);
    expect(allRes.status()).toBe(200);
    const { data: all } = await allRes.json();

    const first = all.items[0];
    if (!first) test.skip(true, "Nenhuma manutencao encontrada para filtrar");

    const filteredRes = await request.get(`${baseUrl}/asset-maintenance?assetId=${first.assetId}`);
    expect(filteredRes.status()).toBe(200);
    const { data: filtered } = await filteredRes.json();

    expect(filtered.items.length).toBeLessThanOrEqual(all.items.length);
    filtered.items.forEach((m: AssetMaintenance) => {
        expect(m.assetId).toBe(first.assetId);
    });
});

test("Validacao de query: page/limit invalidos e assetId invalido em asset-maintenance", async ({
    request,
}) => {
    const resNumbers = await request.get(`${baseUrl}/asset-maintenance?page=abc&limit=xyz`);
    expect(resNumbers.status()).toBe(400);
    const bodyNumbers = await resNumbers.json();
    expect(bodyNumbers.message).toContain(ASSET_MAINTENANCE_ERROR.PAGINATION);

    const res = await request.get(`${baseUrl}/asset-maintenance?assetId=abc`);
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.message).toContain(ASSET_MAINTENANCE_ERROR.INVALID_ASSET_ID);
});

test("Cria, busca e atualiza manutencao de ativo", async ({ request }) => {
    const maintenance = await createAuxMaintenance(request);

    const getRes = await request.get(`${baseUrl}/asset-maintenance/${maintenance.id}`);
    expect(getRes.status()).toBe(200);
    const { data: fetched } = await getRes.json();
    expect(fetched).toBeTruthy();
    expect(fetched.id).toBe(maintenance.id);
    expect(fetched.assetId).toBe(maintenance.assetId);

    const updateRes = await request.put(`${baseUrl}/asset-maintenance/${maintenance.id}`, {
        data: {
            assetId: maintenance.assetId,
            type: AssetMaintenanceType.CORRECTIVE,
            description: "Manutencao corretiva atualizada",
            cost: 750,
            date: new Date().toISOString(),
            technician: "Tecnico Atualizado",
            notes: "Atualizada via teste automatizado",
        },
    });
    expect(updateRes.status()).toBe(200);
    const { data: updated } = await updateRes.json();
    expect(updated.type).toBe(AssetMaintenanceType.CORRECTIVE);
    expect(Number(updated.cost)).toBeCloseTo(750, 6);
});

test("Criar manutencao de ativo sem campos obrigatorios deve falhar (400)", async ({ request }) => {
    const res = await request.post(`${baseUrl}/asset-maintenance`, {
        data: {
            description: "Sem assetId e date",
        },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.message).toContain(ASSET_MAINTENANCE_ERROR.MISSING_FIELDS);
});

test("Criar manutencao de ativo com assetId inexistente deve falhar (404)", async ({ request }) => {
    const res = await request.post(`${baseUrl}/asset-maintenance`, {
        data: {
            assetId: 9999999,
            type: AssetMaintenanceType.PREVENTIVE,
            description: "Manutencao com ativo inexistente",
            cost: 100,
            date: new Date().toISOString(),
        },
    });
    expect(res.status()).toBe(404);
});

test("Criar manutencao de ativo com type invalido deve falhar (400)", async ({ request }) => {
    const asset = await createAuxAsset(request);
    const res = await request.post(`${baseUrl}/asset-maintenance`, {
        data: {
            assetId: asset.id,
            type: "INVALID",
            description: "Manutencao type invalido",
            cost: 100,
            date: new Date().toISOString(),
        },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.message).toContain(ASSET_MAINTENANCE_ERROR.WRONG_FIELD_VALUE);
});

test("Criar manutencao de ativo com cost/data invalidos deve falhar (400)", async ({ request }) => {
    const asset = await createAuxAsset(request);
    const res = await request.post(`${baseUrl}/asset-maintenance`, {
        data: {
            assetId: asset.id,
            type: AssetMaintenanceType.PREVENTIVE,
            description: "Manutencao dados invalidos",
            cost: "NaN",
            date: "data-invalida",
        },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.message).toContain(ASSET_MAINTENANCE_ERROR.WRONG_FIELD_VALUE);
});

test("Atualizar manutencao de ativo inexistente retorna 404", async ({ request }) => {
    const asset = await createAuxAsset(request);
    const res = await request.put(`${baseUrl}/asset-maintenance/9999999`, {
        data: {
            assetId: asset.id,
            type: AssetMaintenanceType.PREVENTIVE,
            description: "Atualizacao inexistente",
            cost: 100,
            date: new Date().toISOString(),
        },
    });
    expect(res.status()).toBe(404);
});

test("Atualizar manutencao de ativo com assetId inexistente deve falhar (404)", async ({
    request,
}) => {
    const maintenance = await createAuxMaintenance(request);
    const res = await request.put(`${baseUrl}/asset-maintenance/${maintenance.id}`, {
        data: {
            assetId: 9999999,
            type: AssetMaintenanceType.PREVENTIVE,
            description: maintenance.description,
            cost: maintenance.cost,
            date: new Date().toISOString(),
            technician: maintenance.technician,
            notes: maintenance.notes,
        },
    });
    expect(res.status()).toBe(404);
});

test("Atualizar manutencao de ativo com type invalido deve falhar (400)", async ({ request }) => {
    const maintenance = await createAuxMaintenance(request);
    const res = await request.put(`${baseUrl}/asset-maintenance/${maintenance.id}`, {
        data: {
            assetId: maintenance.assetId,
            type: "INVALID",
            description: maintenance.description,
            cost: maintenance.cost,
            date: new Date().toISOString(),
            technician: maintenance.technician,
            notes: maintenance.notes,
        },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.message).toContain(ASSET_MAINTENANCE_ERROR.WRONG_FIELD_VALUE);
});

test("Busca manutencoes com search e ordena por cost", async ({ request }) => {
    const asset = await createAuxAsset(request);
    const prefix = `AM_SEARCH_${Date.now().toString().slice(-4)}`;
    const payloads = [
        {
            id: genId(),
            assetId: asset.id,
            type: AssetMaintenanceType.PREVENTIVE,
            description: `${prefix} desc B`,
            cost: 400,
            date: new Date(Date.now() - 3600000).toISOString(),
            technician: `${prefix} Tec B`,
        },
        {
            id: genId(),
            assetId: asset.id,
            type: AssetMaintenanceType.CORRECTIVE,
            description: `${prefix} desc A`,
            cost: 150,
            date: new Date().toISOString(),
            technician: `${prefix} Tec A`,
        },
    ];

    for (const payload of payloads) {
        const resCreate = await request.post(`${baseUrl}/asset-maintenance`, { data: payload });
        expect(resCreate.status()).toBe(200);
    }

    const res = await request.get(
        `${baseUrl}/asset-maintenance?search=${encodeURIComponent(prefix)}&sortBy=cost&sortOrder=asc`
    );
    expect(res.status()).toBe(200);
    const { data } = await res.json();

    const matching = data.items.filter((maintenance: { description?: string | null }) =>
        maintenance.description?.includes(prefix)
    );
    expect(matching.length).toBeGreaterThanOrEqual(2);

    const costs = matching.map((maintenance: { cost: string | null }) =>
        maintenance.cost ? Number(maintenance.cost) : 0
    );
    const sorted = [...costs].sort((a, b) => a - b);
    expect(costs).toEqual(sorted);
});
