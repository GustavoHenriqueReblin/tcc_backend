import { test, expect } from "@playwright/test";
import { env } from "../src/config/env";
import { genId } from "./utils/idGenerator";

const baseUrl = `http://${env.DOMAIN}:${env.PORT}/api/v1`;

test("Lista unities com paginação básica", async ({ request }) => {
    const res = await request.get(`${baseUrl}/unities`);
    expect(res.status()).toBe(200);
    const { data } = await res.json();

    expect(Array.isArray(data.unities)).toBeTruthy();
    expect(typeof data.meta.total).toBe("number");
    expect(data.meta.page).toBe(1);
    expect(data.unities.length).toBeLessThanOrEqual(10);
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

test("Atualizar unity inexistente retorna 404", async ({ request }) => {
    const res = await request.put(`${baseUrl}/unities/9999999`, { data: { simbol: "INV" } });
    expect(res.status()).toBe(404);
    const body = await res.json();
    expect(body.error).toBeTruthy();
});
