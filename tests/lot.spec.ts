import { test, expect, APIRequestContext } from "@playwright/test";
import { env } from "../src/config/env";
import { LOT_ERROR } from "../src/middleware/lot.middleware";
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
    const nameBase = `PROD_L_${Date.now().toString().slice(-6)}`;
    const payload = {
        id: genId(),
        productDefinitionId: def.id,
        unityId: unity.id,
        name: nameBase,
        barcode: null,
        inventory: {
            costValue: 3.21,
            saleValue: 9.87,
            quantity: 10,
        },
    };
    const res = await request.post(`${baseUrl}/products`, { data: payload });
    expect(res.status()).toBe(200);
    const { data } = await res.json();
    return data;
};

test("Lista lotes com paginação básica", async ({ request }) => {
    const res = await request.get(`${baseUrl}/lots`);
    expect(res.status()).toBe(200);
    const { data } = await res.json();
    expect(Array.isArray(data.items)).toBeTruthy();
    expect(typeof data.meta.total).toBe("number");
    expect(data.meta.page).toBe(1);
    expect(data.items.length).toBeLessThanOrEqual(10);
});

test("Validação de query: page/limit inválidos", async ({ request }) => {
    const resNumbers = await request.get(`${baseUrl}/lots?page=abc&limit=xyz`);
    expect(resNumbers.status()).toBe(400);
    const bodyNumbers = await resNumbers.json();
    expect(bodyNumbers.message).toContain(LOT_ERROR.PAGINATION);
});

test("Cria, busca e atualiza lote", async ({ request }) => {
    const product = await createAuxProduct(request);
    const uniqueCode = `L${Date.now().toString().slice(-6)}`;
    const payload = {
        id: genId(),
        code: uniqueCode,
        productId: product.id,
        notes: "Lote teste",
    };

    const createRes = await request.post(`${baseUrl}/lots`, { data: payload });
    expect(createRes.status()).toBe(200);
    const { data: created } = await createRes.json();
    expect(created.code).toBe(uniqueCode);
    expect(created.productId).toBe(product.id);

    const getRes = await request.get(`${baseUrl}/lots/${created.id}`);
    expect(getRes.status()).toBe(200);
    const { data: fetched } = await getRes.json();
    expect(fetched.id).toBe(created.id);

    const updateRes = await request.put(`${baseUrl}/lots/${created.id}`, {
        data: { code: `${uniqueCode}X`, notes: null },
    });
    expect(updateRes.status()).toBe(200);
    const { data: updated } = await updateRes.json();
    expect(updated.code).toBe(`${uniqueCode}X`);
});

test("Criar lote com code duplicado retorna 409", async ({ request }) => {
    const product = await createAuxProduct(request);
    const code = `LD${Date.now().toString().slice(-6)}`;
    const res1 = await request.post(`${baseUrl}/lots`, {
        data: { id: genId(), code, productId: product.id, notes: null },
    });
    expect(res1.status()).toBe(200);

    const res2 = await request.post(`${baseUrl}/lots`, {
        data: { id: genId(), code, productId: product.id, notes: null },
    });
    expect(res2.status()).toBe(409);
});

test("Busca lotes com search e ordenação por code", async ({ request }) => {
    const product = await createAuxProduct(request);
    const prefix = `LOTSEARCH_${Date.now().toString().slice(-4)}`;
    const lotPayloads = [
        { id: genId(), code: `${prefix}B`, productId: product.id, notes: `${prefix} note B` },
        { id: genId(), code: `${prefix}A`, productId: product.id, notes: `${prefix} note A` },
    ];

    for (const payload of lotPayloads) {
        const createRes = await request.post(`${baseUrl}/lots`, { data: payload });
        expect(createRes.status()).toBe(200);
    }

    const res = await request.get(
        `${baseUrl}/lots?search=${prefix}&sortBy=code&sortOrder=asc&limit=10`
    );
    expect(res.status()).toBe(200);
    const { data } = await res.json();

    const matching = data.items.filter((lot: { code: string }) => lot.code.includes(prefix));
    expect(matching.length).toBeGreaterThanOrEqual(2);
    expect(
        matching.every((lot: { notes?: string | null }) => lot.notes?.includes(prefix))
    ).toBeTruthy();

    const codes = matching.map((lot: { code: string }) => lot.code);
    const sorted = [...codes].sort();
    expect(codes).toEqual(sorted);
});
