import { test, expect } from "@playwright/test";
import { env } from "../src/config/env";
import { WAREHOUSE_ERROR } from "../src/middleware/warehouse.middleware";
import { genId } from "./utils/idGenerator";

const baseUrl = `http://${env.DOMAIN}:${env.PORT}/api/v1`;

test("Lista warehouses com paginação básica", async ({ request }) => {
    const res = await request.get(`${baseUrl}/warehouses`);
    expect(res.status()).toBe(200);
    const { data } = await res.json();

    expect(Array.isArray(data.items)).toBeTruthy();
    expect(typeof data.meta.total).toBe("number");
    expect(data.meta.page).toBe(1);
    expect(data.items.length).toBeLessThanOrEqual(10);
});

test("Validação de query: page/limit inválidos", async ({ request }) => {
    const resNumbers = await request.get(`${baseUrl}/warehouses?page=abc&limit=xyz`);
    expect(resNumbers.status()).toBe(400);
    const bodyNumbers = await resNumbers.json();
    expect(bodyNumbers.message).toContain(WAREHOUSE_ERROR.PAGINATION);
});

test("Validação de id e ordenação do warehouse", async ({ request }) => {
    const resInvalidId = await request.get(`${baseUrl}/warehouses/not-a-number`);
    expect(resInvalidId.status()).toBe(400);
    const bodyInvalidId = await resInvalidId.json();
    expect(bodyInvalidId.message).toContain(WAREHOUSE_ERROR.ID);

    const resInvalidSortOrder = await request.get(`${baseUrl}/warehouses?sortOrder=ascending`);
    expect(resInvalidSortOrder.status()).toBe(400);
    const bodyInvalidSortOrder = await resInvalidSortOrder.json();
    expect(bodyInvalidSortOrder.message).toContain(WAREHOUSE_ERROR.SORT);

    const resInvalidSortBy = await request.get(`${baseUrl}/warehouses?sortBy=unknown`);
    expect(resInvalidSortBy.status()).toBe(400);
    const bodyInvalidSortBy = await resInvalidSortBy.json();
    expect(bodyInvalidSortBy.message).toContain(WAREHOUSE_ERROR.SORT_BY);
});

test("Cria, busca e atualiza warehouse", async ({ request }) => {
    const uniqueCode = `W${Date.now().toString().slice(-6)}`;
    const payload = {
        id: genId(),
        code: uniqueCode,
        name: "Armazém de Teste",
        description: "Armazém criado para testes",
    };

    // Create
    const createRes = await request.post(`${baseUrl}/warehouses`, { data: payload });
    expect(createRes.status()).toBe(200);
    const { data: created } = await createRes.json();
    expect(created).toBeTruthy();
    expect(created.code).toBe(uniqueCode);
    expect(created.name).toBe("Armazém de Teste");

    // Get by id
    const getRes = await request.get(`${baseUrl}/warehouses/${created.id}`);
    expect(getRes.status()).toBe(200);
    const { data: fetched } = await getRes.json();
    expect(fetched).toBeTruthy();
    expect(fetched.id).toBe(created.id);

    // Update
    const updateRes = await request.put(`${baseUrl}/warehouses/${created.id}`, {
        data: { code: `${uniqueCode}X`, name: "Armazém Atualizado", description: null },
    });
    expect(updateRes.status()).toBe(200);
    const { data: updated } = await updateRes.json();
    expect(updated.code).toBe(`${uniqueCode}X`);
    expect(updated.name).toBe("Armazém Atualizado");
});

test("Criar warehouse com code duplicado retorna 409", async ({ request }) => {
    const uniqueCode = `D${Date.now().toString().slice(-6)}`;
    const res1 = await request.post(`${baseUrl}/warehouses`, {
        data: { id: genId(), code: uniqueCode, name: "Dup A", description: null },
    });
    expect(res1.status()).toBe(200);

    const res2 = await request.post(`${baseUrl}/warehouses`, {
        data: { id: genId(), code: uniqueCode, name: "Dup B", description: null },
    });
    expect(res2.status()).toBe(409);
    const body = await res2.json();
    expect(body.error).toBeTruthy();
});

test("Buscar warehouse por id inexistente retorna 404", async ({ request }) => {
    const res = await request.get(`${baseUrl}/warehouses/-9999999`);
    expect(res.status()).toBe(404);
    const body = await res.json();
    expect(body.error).toBeTruthy();
});

test("Atualizar warehouse inexistente retorna 404", async ({ request }) => {
    const res = await request.put(`${baseUrl}/warehouses/9999999`, {
        data: { code: `INV${Date.now().toString().slice(-3)}`, name: "Inexistente" },
    });
    expect(res.status()).toBe(404);
    const body = await res.json();
    expect(body.error).toBeTruthy();
});

test("Busca e ordenação de warehouses", async ({ request }) => {
    const listRes = await request.get(`${baseUrl}/warehouses`);
    expect(listRes.status()).toBe(200);
    const { data: list } = await listRes.json();
    expect(list.items.length).toBeGreaterThan(0);

    const searchTerm = list.items[0].code.slice(0, 2);

    const resSearch = await request.get(
        `${baseUrl}/warehouses?search=${encodeURIComponent(searchTerm)}&sortBy=code&sortOrder=asc`
    );
    expect(resSearch.status()).toBe(200);
    const { data: searchData } = await resSearch.json();
    expect(searchData.items.length).toBeGreaterThan(0);
    expect(
        searchData.items.every(
            (wh: { code: string; name: string; description?: string | null }) =>
                wh.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                wh.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                wh.description?.toLowerCase().includes(searchTerm.toLowerCase())
        )
    ).toBeTruthy();

    const codes = searchData.items.map((w: { code: string }) => w.code.toLowerCase());
    const sortedCodes = [...codes].sort();
    expect(codes).toEqual(sortedCodes);
});
