import { test, expect } from "@playwright/test";
import { UNITY_ERROR } from "../src/middleware/unity.middleware";
import { genId } from "./utils/idGenerator";

const baseUrl = `http://localhost:${process.env.PORT ?? "3333"}/api/v1`;

test("Lista unities com paginação básica", async ({ request }) => {
    const res = await request.get(`${baseUrl}/unities`);
    expect(res.status()).toBe(200);
    const { data } = await res.json();

    expect(Array.isArray(data.items)).toBeTruthy();
    expect(typeof data.meta.total).toBe("number");
    expect(data.meta.page).toBe(1);
    expect(data.items.length).toBeLessThanOrEqual(10);
});

test("Cria, busca e atualiza unity", async ({ request }) => {
    const simbol = `T${Date.now().toString().slice(-6)}`; // <= 7 chars
    const payload = { id: genId(), simbol, description: "Unidade de teste" };

    const createRes = await request.post(`${baseUrl}/unities`, { data: payload });
    expect(createRes.status()).toBe(200);
    const { data: created } = await createRes.json();
    expect(created.simbol).toBe(simbol);

    const getRes = await request.get(`${baseUrl}/unities/${created.id}`);
    expect(getRes.status()).toBe(200);
    const { data: fetched } = await getRes.json();
    expect(fetched).toBeTruthy();
    expect(fetched.id).toBe(created.id);

    const updateRes = await request.put(`${baseUrl}/unities/${created.id}`, {
        data: { simbol: `${simbol}X`, description: "Atualizado" },
    });
    expect(updateRes.status()).toBe(200);
    const { data: updated } = await updateRes.json();
    expect(updated.simbol).toBe(`${simbol}X`);
});

test("Criar unity com simbol duplicado retorna 409", async ({ request }) => {
    const simbol = `D${Date.now().toString().slice(-6)}`;
    const res1 = await request.post(`${baseUrl}/unities`, {
        data: { id: genId(), simbol, description: null },
    });
    expect(res1.status()).toBe(200);

    const res2 = await request.post(`${baseUrl}/unities`, {
        data: { id: genId(), simbol, description: null },
    });
    expect(res2.status()).toBe(409);
    const body = await res2.json();
    expect(body.error).toBeTruthy();
});

test("Buscar unity por id inexistente retorna data = null", async ({ request }) => {
    const res = await request.get(`${baseUrl}/unities/-9999999`);
    expect(res.status()).toBe(200);
    const { data } = await res.json();
    expect(data).toBeNull();
});

test("Validação de id, paginação e ordenação de unity", async ({ request }) => {
    const resInvalidId = await request.get(`${baseUrl}/unities/not-a-number`);
    expect(resInvalidId.status()).toBe(400);
    const bodyInvalidId = await resInvalidId.json();
    expect(bodyInvalidId.message).toContain(UNITY_ERROR.ID);

    const resInvalidPagination = await request.get(`${baseUrl}/unities?page=abc&limit=xyz`);
    expect(resInvalidPagination.status()).toBe(400);
    const bodyInvalidPagination = await resInvalidPagination.json();
    expect(bodyInvalidPagination.message).toContain(UNITY_ERROR.PAGINATION);

    const resInvalidSortOrder = await request.get(`${baseUrl}/unities?sortOrder=ascending`);
    expect(resInvalidSortOrder.status()).toBe(400);
    const bodyInvalidSortOrder = await resInvalidSortOrder.json();
    expect(bodyInvalidSortOrder.message).toContain(UNITY_ERROR.SORT);

    const resInvalidSortBy = await request.get(`${baseUrl}/unities?sortBy=unknown`);
    expect(resInvalidSortBy.status()).toBe(400);
    const bodyInvalidSortBy = await resInvalidSortBy.json();
    expect(bodyInvalidSortBy.message).toContain(UNITY_ERROR.SORT_BY);
});

test("Busca e ordenação de unities", async ({ request }) => {
    const listRes = await request.get(`${baseUrl}/unities`);
    expect(listRes.status()).toBe(200);
    const { data: list } = await listRes.json();
    expect(list.items.length).toBeGreaterThan(0);

    const sample = list.items[0];
    const searchTerm = sample.simbol.slice(0, 1);

    const resSearch = await request.get(
        `${baseUrl}/unities?search=${encodeURIComponent(searchTerm)}&sortBy=simbol&sortOrder=asc`
    );
    expect(resSearch.status()).toBe(200);
    const { data: searchData } = await resSearch.json();
    expect(searchData.items.length).toBeGreaterThan(0);
    expect(
        searchData.items.every(
            (unity: { simbol: string; description?: string | null }) =>
                unity.simbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
                unity.description?.toLowerCase().includes(searchTerm.toLowerCase())
        )
    ).toBeTruthy();

    const simbols = searchData.items.map((u: { simbol: string }) => u.simbol.toLowerCase());
    const sortedSimbols = [...simbols].sort();
    expect(simbols).toEqual(sortedSimbols);
});

test("Atualizar unity inexistente retorna 404", async ({ request }) => {
    const res = await request.put(`${baseUrl}/unities/9999999`, { data: { simbol: "INV" } });
    expect(res.status()).toBe(404);
    const body = await res.json();
    expect(body.error).toBeTruthy();
});
