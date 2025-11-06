import { test, expect, APIRequestContext } from "@playwright/test";
import { env } from "../src/config/env";
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

test("Lista produtos com paginação básica", async ({ request }) => {
    const res = await request.get(`${baseUrl}/products`);
    expect(res.status()).toBe(200);
    const { data } = await res.json();

    expect(Array.isArray(data.products)).toBeTruthy();
    expect(typeof data.meta.total).toBe("number");
    expect(data.meta.page).toBe(1);
    expect(data.products.length).toBeLessThanOrEqual(10);
});

test("Cria produto (com inventory), busca e atualiza", async ({ request }) => {
    // Cria dependências auxiliares
    const unity = await createAuxUnity(request);
    const def = await createAuxDefinition(request);

    const nameBase = `PROD_${Date.now().toString().slice(-6)}`;
    const payload = {
        id: genId(),
        productDefinitionId: def.id,
        unityId: unity.id,
        name: nameBase,
        barcode: null,
        inventory: {
            costValue: 12.3456,
            saleValue: 23.4567,
            quantity: 100.1234,
        },
    };

    // Create
    const createRes = await request.post(`${baseUrl}/products`, { data: payload });
    expect(createRes.status()).toBe(200);
    const { data: created } = await createRes.json();
    expect(created).toBeTruthy();
    expect(created.name).toBe(nameBase);
    expect(created.productInventory?.length ?? 0).toBeGreaterThan(0);
    expect(Number(created.productInventory[0].quantity)).toBeCloseTo(payload.inventory.quantity, 5);

    // Get by id
    const getRes = await request.get(`${baseUrl}/products/${created.id}`);
    expect(getRes.status()).toBe(200);
    const { data: fetched } = await getRes.json();
    expect(fetched).toBeTruthy();
    expect(fetched.id).toBe(created.id);
    expect(fetched.unity?.id).toBe(unity.id);
    expect(fetched.productDefinition?.id).toBe(def.id);

    // Update product and inventory
    const updateRes = await request.put(`${baseUrl}/products/${created.id}`, {
        data: {
            productDefinitionId: def.id,
            unityId: unity.id,
            name: `${nameBase}_UPD`,
            barcode: "7890001112223",
            inventory: {
                costValue: 9.99,
                saleValue: 19.99,
                quantity: 88.8888,
            },
        },
    });
    expect(updateRes.status()).toBe(200);
    const { data: updated } = await updateRes.json();
    expect(updated.name).toBe(`${nameBase}_UPD`);
    expect(updated.barcode).toBe("7890001112223");
    expect(Number(updated.productInventory[0].costValue)).toBeCloseTo(9.99, 2);
    expect(Number(updated.productInventory[0].saleValue)).toBeCloseTo(19.99, 2);
    expect(Number(updated.productInventory[0].quantity)).toBeCloseTo(88.8888, 4);
});

test("Buscar produto inexistente retorna data = null", async ({ request }) => {
    const res = await request.get(`${baseUrl}/products/-9999999`);
    expect(res.status()).toBe(404);
    const body = await res.json();
    expect(body.error).toBeTruthy();
});

test("Atualizar produto inexistente retorna 404", async ({ request }) => {
    const res = await request.put(`${baseUrl}/products/9999999`, {
        data: {
            name: "Inexistente",
            inventory: { costValue: 1, saleValue: 2, quantity: 3 },
        },
    });
    expect(res.status()).toBe(404);
    const body = await res.json();
    expect(body.error).toBeTruthy();
});
