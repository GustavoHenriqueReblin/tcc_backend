import { test, expect } from "@playwright/test";
import { env } from "../src/config/env";
import { ProductDefinitionType } from "@prisma/client";
import { genId } from "./utils/idGenerator";

const baseUrl = `http://${env.DOMAIN}:${env.PORT}/api/v1`;

test("Lista definições de produto com paginação básica", async ({ request }) => {
    const res = await request.get(`${baseUrl}/product-definitions`);
    expect(res.status()).toBe(200);
    const { data } = await res.json();

    expect(Array.isArray(data.productDefinitions)).toBeTruthy();
    expect(typeof data.meta.total).toBe("number");
    expect(data.meta.page).toBe(1);
    expect(data.productDefinitions.length).toBeLessThanOrEqual(10);
});

test("Cria, busca e atualiza uma definição de produto", async ({ request }) => {
    const uniqueName = `DEF_${Date.now().toString().slice(-6)}`;
    const payload = {
        id: genId(),
        name: uniqueName,
        description: "Definição de teste",
        type: ProductDefinitionType.FINISHED_PRODUCT,
    };

    // Create
    const createRes = await request.post(`${baseUrl}/product-definitions`, { data: payload });
    expect(createRes.status()).toBe(200);
    const { data: created } = await createRes.json();
    expect(created).toBeTruthy();
    expect(created.name).toBe(uniqueName);
    expect(created.type).toBe(ProductDefinitionType.FINISHED_PRODUCT);

    // Get by id
    const getRes = await request.get(`${baseUrl}/product-definitions/${created.id}`);
    expect(getRes.status()).toBe(200);
    const { data: fetched } = await getRes.json();
    expect(fetched).toBeTruthy();
    expect(fetched.id).toBe(created.id);

    // Update
    const updateRes = await request.put(`${baseUrl}/product-definitions/${created.id}`, {
        data: {
            name: `${uniqueName}_UPD`,
            description: "Atualizado",
            type: ProductDefinitionType.RAW_MATERIAL,
        },
    });
    expect(updateRes.status()).toBe(200);
    const { data: updated } = await updateRes.json();
    expect(updated.name).toBe(`${uniqueName}_UPD`);
    expect(updated.type).toBe(ProductDefinitionType.RAW_MATERIAL);
});

test("Buscar definição por id inexistente retorna data = null", async ({ request }) => {
    const res = await request.get(`${baseUrl}/product-definitions/-9999999`);
    expect(res.status()).toBe(200);
    const { data } = await res.json();
    expect(data).toBeNull();
});

test("Atualizar definição inexistente retorna 404", async ({ request }) => {
    const res = await request.put(`${baseUrl}/product-definitions/9999999`, {
        data: { name: "Inexistente", type: ProductDefinitionType.RAW_MATERIAL },
    });
    expect(res.status()).toBe(404);
    const body = await res.json();
    expect(body.error).toBeTruthy();
});
