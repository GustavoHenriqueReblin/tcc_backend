import { test, expect } from "@playwright/test";
import { env } from "../src/config/env";
import { TransactionType } from "@prisma/client";
import { FINANCIAL_TRANSACTION_ERROR } from "../src/middleware/financialTransactionMiddleware";
import { genId } from "./utils/idGenerator";

const baseUrl = `http://${env.DOMAIN}:${env.PORT}/api/v1`;

test("Lista lançamentos financeiros e valida paginação básica", async ({ request }) => {
    const res = await request.get(`${baseUrl}/financial-transactions`);
    expect(res.status()).toBe(200);
    const { data } = await res.json();

    expect(Array.isArray(data.transactions)).toBeTruthy();
    expect(typeof data.meta.total).toBe("number");
    expect(data.meta.page).toBe(1);
    expect(data.transactions.length).toBeLessThanOrEqual(10);
});

test("Filtro type inválido deve retornar 400", async ({ request }) => {
    const res = await request.get(`${baseUrl}/financial-transactions?type=INVALID`);
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.message).toContain(FINANCIAL_TRANSACTION_ERROR.INVALID_TYPE);
});

test("Cria, busca e atualiza lançamento financeiro", async ({ request }) => {
    const recRes = await request.get(`${baseUrl}/accounts-receivable`);
    expect(recRes.status()).toBe(200);
    const { data: rlist } = await recRes.json();
    const receivable = rlist.receivables[0];

    const payload = {
        id: genId(),
        type: TransactionType.CREDIT,
        value: 50.5,
        date: new Date().toISOString(),
        category: "Teste",
        description: "Lançamento financeiro de teste",
        accountsReceivableId: receivable?.id ?? null,
        accountsPayableId: null,
        notes: "Criado via teste automatizado",
    };

    const createRes = await request.post(`${baseUrl}/financial-transactions`, { data: payload });
    expect(createRes.status()).toBe(200);
    const { data: created } = await createRes.json();
    expect(created).toBeTruthy();
    expect(Number(created.value)).toBeCloseTo(50.5, 6);
    expect(created.type).toBe(TransactionType.CREDIT);

    const getRes = await request.get(`${baseUrl}/financial-transactions/${created.id}`);
    expect(getRes.status()).toBe(200);
    const { data: fetched } = await getRes.json();
    expect(fetched).toBeTruthy();
    expect(fetched.id).toBe(created.id);

    const updateRes = await request.put(`${baseUrl}/financial-transactions/${created.id}`, {
        data: {
            type: TransactionType.DEBIT,
            value: 75.25,
            date: new Date().toISOString(),
            category: "Teste atualizado",
            description: "Lançamento financeiro atualizado",
            accountsReceivableId: created.accountsReceivableId,
            accountsPayableId: created.accountsPayableId,
            notes: "Atualizado via teste automatizado",
        },
    });
    expect(updateRes.status()).toBe(200);
    const { data: updated } = await updateRes.json();
    expect(Number(updated.value)).toBeCloseTo(75.25, 6);
    expect(updated.type).toBe(TransactionType.DEBIT);
});
