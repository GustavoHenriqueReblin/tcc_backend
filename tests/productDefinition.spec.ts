import { test, expect, APIRequestContext } from "@playwright/test";
import { env } from "../src/config/env";
import { ProductDefinitionType } from "@prisma/client";
import { PRODUCT_DEFINITION_ERROR } from "../src/middleware/productDefinition.middleware";
import { genId } from "./utils/idGenerator";

const baseUrl = `http://${env.DOMAIN}:${env.PORT}/api/v1`;

const findDefinitionByType = async (request: APIRequestContext, type: ProductDefinitionType) => {
    const res = await request.get(`${baseUrl}/product-definitions?type=${type}`);
    expect(res.status()).toBe(200);
    const { data } = await res.json();
    return data.items.find((pd: { type: ProductDefinitionType }) => pd.type === type) ?? null;
};

const getAvailableType = async (
    request: APIRequestContext,
    exclude: ProductDefinitionType[] = []
) => {
    for (const type of Object.values(ProductDefinitionType)) {
        if (exclude.includes(type as ProductDefinitionType)) continue;
        const existing = await findDefinitionByType(request, type as ProductDefinitionType);
        if (!existing) return type as ProductDefinitionType;
    }
    throw new Error("No available ProductDefinitionType for creation");
};

interface CreateDefinitionOptions {
    allowExisting?: boolean;
    suffix?: string;
}

const createDefinition = async (
    request: APIRequestContext,
    type: ProductDefinitionType,
    options: CreateDefinitionOptions = {}
) => {
    const { allowExisting = true, suffix = Date.now().toString().slice(-6) } = options;

    if (allowExisting) {
        const existing = await findDefinitionByType(request, type);
        if (existing) return existing;
    }

    const name = `DEF_${type}_${suffix}`;
    const res = await request.post(`${baseUrl}/product-definitions`, {
        data: {
            id: genId(),
            name,
            description: `Definicao ${type}`,
            type,
        },
    });
    expect(res.status()).toBe(200);
    const { data } = await res.json();
    return data;
};

test("Lista definicoes de produto com paginacao basica", async ({ request }) => {
    const res = await request.get(`${baseUrl}/product-definitions`);
    expect(res.status()).toBe(200);
    const { data } = await res.json();

    expect(Array.isArray(data.items)).toBeTruthy();
    expect(typeof data.meta.total).toBe("number");
    expect(data.meta.page).toBe(1);
    expect(data.items.length).toBeLessThanOrEqual(10);
});

test("Cria, busca e atualiza uma definicao de produto", async ({ request }) => {
    const initialType = await getAvailableType(request);
    const updatedType = await getAvailableType(request, [initialType]);
    const uniqueName = `DEF_${Date.now().toString().slice(-6)}`;
    const payload = {
        id: genId(),
        name: uniqueName,
        description: "Definicao de teste",
        type: initialType,
    };

    const createRes = await request.post(`${baseUrl}/product-definitions`, { data: payload });
    expect(createRes.status()).toBe(200);
    const { data: created } = await createRes.json();
    expect(created).toBeTruthy();
    expect(created.name).toBe(uniqueName);
    expect(created.type).toBe(initialType);

    const getRes = await request.get(`${baseUrl}/product-definitions/${created.id}`);
    expect(getRes.status()).toBe(200);
    const { data: fetched } = await getRes.json();
    expect(fetched).toBeTruthy();
    expect(fetched.id).toBe(created.id);

    const updateRes = await request.put(`${baseUrl}/product-definitions/${created.id}`, {
        data: {
            name: `${uniqueName}_UPD`,
            description: "Atualizado",
            type: updatedType,
        },
    });
    expect(updateRes.status()).toBe(200);
    const { data: updated } = await updateRes.json();
    expect(updated.name).toBe(`${uniqueName}_UPD`);
    expect(updated.type).toBe(updatedType);
});

test("Buscar definicao por id inexistente retorna data = null", async ({ request }) => {
    const res = await request.get(`${baseUrl}/product-definitions/-9999999`);
    expect(res.status()).toBe(200);
    const { data } = await res.json();
    expect(data).toBeNull();
});

test("Atualizar definicao inexistente retorna 404", async ({ request }) => {
    const res = await request.put(`${baseUrl}/product-definitions/9999999`, {
        data: { name: "Inexistente", type: ProductDefinitionType.RAW_MATERIAL },
    });
    expect(res.status()).toBe(404);
    const body = await res.json();
    expect(body.error).toBeTruthy();
});

test("Criar definicao com type duplicado retorna 409", async ({ request }) => {
    await createDefinition(request, ProductDefinitionType.FINISHED_PRODUCT);

    const res = await request.post(`${baseUrl}/product-definitions`, {
        data: {
            id: genId(),
            name: `DUP_${Date.now().toString().slice(-6)}`,
            description: "Tentativa duplicada",
            type: ProductDefinitionType.FINISHED_PRODUCT,
        },
    });
    expect(res.status()).toBe(409);
    const body = await res.json();
    expect(body.error).toBeTruthy();
});

test("Atualizar definicao para type ja existente retorna 409", async ({ request }) => {
    const baseType = await getAvailableType(request, [
        ProductDefinitionType.FINISHED_PRODUCT,
        ProductDefinitionType.RAW_MATERIAL,
    ]);
    const conflictType = await getAvailableType(request, [baseType]);

    const baseDef = await createDefinition(request, baseType, { allowExisting: false });
    const conflictDef = await createDefinition(request, conflictType, { allowExisting: false });

    const res = await request.put(`${baseUrl}/product-definitions/${conflictDef.id}`, {
        data: {
            name: `${conflictDef.name}_UPD`,
            description: conflictDef.description,
            type: baseDef.type,
        },
    });
    expect(res.status()).toBe(409);
    const body = await res.json();
    expect(body.error).toBeTruthy();
});

test("Validacao de id e query de definicao de produto", async ({ request }) => {
    const resInvalidId = await request.get(`${baseUrl}/product-definitions/not-a-number`);
    expect(resInvalidId.status()).toBe(400);
    const bodyInvalidId = await resInvalidId.json();
    expect(bodyInvalidId.message).toContain(PRODUCT_DEFINITION_ERROR.ID);

    const resInvalidPagination = await request.get(
        `${baseUrl}/product-definitions?page=abc&limit=xyz`
    );
    expect(resInvalidPagination.status()).toBe(400);
    const bodyInvalidPagination = await resInvalidPagination.json();
    expect(bodyInvalidPagination.message).toContain(PRODUCT_DEFINITION_ERROR.PAGINATION);

    const resInvalidSortOrder = await request.get(
        `${baseUrl}/product-definitions?sortOrder=ascending`
    );
    expect(resInvalidSortOrder.status()).toBe(400);
    const bodyInvalidSortOrder = await resInvalidSortOrder.json();
    expect(bodyInvalidSortOrder.message).toContain(PRODUCT_DEFINITION_ERROR.SORT);

    const resInvalidType = await request.get(`${baseUrl}/product-definitions?type=INVALID_TYPE`);
    expect(resInvalidType.status()).toBe(400);
    const bodyInvalidType = await resInvalidType.json();
    expect(bodyInvalidType.message).toContain(PRODUCT_DEFINITION_ERROR.TYPE);

    const resInvalidSortBy = await request.get(
        `${baseUrl}/product-definitions?sortBy=unknownField`
    );
    expect(resInvalidSortBy.status()).toBe(400);
    const bodyInvalidSortBy = await resInvalidSortBy.json();
    expect(bodyInvalidSortBy.message).toContain(PRODUCT_DEFINITION_ERROR.SORT_BY);
});

test("Filtra definicoes de produto por type", async ({ request }) => {
    const rawDef = await createDefinition(request, ProductDefinitionType.RAW_MATERIAL);
    await createDefinition(request, ProductDefinitionType.FINISHED_PRODUCT);

    const res = await request.get(
        `${baseUrl}/product-definitions?type=${ProductDefinitionType.RAW_MATERIAL}`
    );
    expect(res.status()).toBe(200);
    const { data } = await res.json();

    expect(data.items.length).toBeGreaterThan(0);
    expect(
        data.items.every((pd: { type: ProductDefinitionType }) => pd.type === rawDef.type)
    ).toBeTruthy();
    expect(data.items.some((pd: { id: number }) => pd.id === rawDef.id)).toBeTruthy();
});

test("Busca e ordenacao de definicoes de produto", async ({ request }) => {
    const listRes = await request.get(`${baseUrl}/product-definitions`);
    expect(listRes.status()).toBe(200);
    const { data: list } = await listRes.json();
    expect(list.items.length).toBeGreaterThan(0);

    const sample = list.items[0];
    const searchTerm = sample.name.slice(0, 3);

    const resSearch = await request.get(
        `${baseUrl}/product-definitions?search=${encodeURIComponent(
            searchTerm
        )}&sortBy=name&sortOrder=asc`
    );
    expect(resSearch.status()).toBe(200);
    const { data: searchData } = await resSearch.json();
    expect(searchData.items.length).toBeGreaterThan(0);
    expect(
        searchData.items.every(
            (pd: { name: string; description?: string | null }) =>
                pd.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                pd.description?.toLowerCase().includes(searchTerm.toLowerCase())
        )
    ).toBeTruthy();

    const names = searchData.items.map((pd: { name: string }) => pd.name.toLowerCase());
    const sortedNames = [...names].sort();
    expect(names).toEqual(sortedNames);
});
