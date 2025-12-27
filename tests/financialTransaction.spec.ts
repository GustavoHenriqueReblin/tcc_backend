import { test, expect } from "@playwright/test";
import { TransactionType } from "@prisma/client";
import { FINANCIAL_TRANSACTION_ERROR } from "../src/middleware/financialTransaction.middleware";
import { genId } from "./utils/idGenerator";

const baseUrl = `http://localhost:${process.env.PORT ?? "3333"}/api/v1`;

test("Lista lancamentos financeiros e valida paginacao basica", async ({ request }) => {
    const res = await request.get(`${baseUrl}/financial-transactions`);
    expect(res.status()).toBe(200);
    const { data } = await res.json();

    expect(Array.isArray(data.items)).toBeTruthy();
    expect(typeof data.meta.total).toBe("number");
    expect(data.meta.page).toBe(1);
    expect(data.items.length).toBeLessThanOrEqual(10);
});

test("Lista lancamentos financeiros filtrando por type retorna subconjunto", async ({
    request,
}) => {
    const allRes = await request.get(`${baseUrl}/financial-transactions`);
    expect(allRes.status()).toBe(200);
    const { data: all } = await allRes.json();

    const creditRes = await request.get(
        `${baseUrl}/financial-transactions?type=${TransactionType.CREDIT}`
    );
    expect(creditRes.status()).toBe(200);
    const { data: credit } = await creditRes.json();

    expect(credit.items.length).toBeLessThanOrEqual(all.items.length);
});

test("Validacao de query: page/limit invalidos e type invalido", async ({ request }) => {
    const resNumbers = await request.get(`${baseUrl}/financial-transactions?page=abc&limit=xyz`);
    expect(resNumbers.status()).toBe(400);
    const bodyNumbers = await resNumbers.json();
    expect(bodyNumbers.message).toContain(FINANCIAL_TRANSACTION_ERROR.PAGINATION);

    const res = await request.get(`${baseUrl}/financial-transactions?type=INVALID`);
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.message).toContain(FINANCIAL_TRANSACTION_ERROR.INVALID_TYPE);
});

test("Cria, busca e atualiza lancamento financeiro com conta a receber", async ({ request }) => {
    const recRes = await request.get(`${baseUrl}/accounts-receivable`);
    expect(recRes.status()).toBe(200);
    const { data: rlist } = await recRes.json();
    const receivable = rlist.items[0];

    const payload = {
        id: genId(),
        type: TransactionType.CREDIT,
        value: 50.5,
        date: new Date().toISOString(),
        category: "Teste",
        description: "Lancamento financeiro de teste",
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
    expect(fetched.receivable).toBeTruthy();

    const updateRes = await request.put(`${baseUrl}/financial-transactions/${created.id}`, {
        data: {
            type: TransactionType.DEBIT,
            value: 75.25,
            date: new Date().toISOString(),
            category: "Teste atualizado",
            description: "Lancamento financeiro atualizado",
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

test("Cria lancamento financeiro com conta a pagar", async ({ request }) => {
    const payRes = await request.get(`${baseUrl}/accounts-payable`);
    expect(payRes.status()).toBe(200);
    const { data: plist } = await payRes.json();
    const payable = plist.items[0];

    const payload = {
        id: genId(),
        type: TransactionType.DEBIT,
        value: 99.9,
        date: new Date().toISOString(),
        category: "Teste debito",
        description: "Lancamento financeiro de debito",
        accountsReceivableId: null,
        accountsPayableId: payable?.id ?? null,
        notes: "Criado via teste automatizado 2",
    };

    const createRes = await request.post(`${baseUrl}/financial-transactions`, { data: payload });
    expect(createRes.status()).toBe(200);
    const { data: created } = await createRes.json();
    expect(created).toBeTruthy();
    expect(created.type).toBe(TransactionType.DEBIT);
    expect(Number(created.value)).toBeCloseTo(99.9, 6);

    const getRes = await request.get(`${baseUrl}/financial-transactions/${created.id}`);
    expect(getRes.status()).toBe(200);
    const { data: fetched } = await getRes.json();
    expect(fetched).toBeTruthy();
    expect(fetched.payable).toBeTruthy();
});

test("Buscar lancamento financeiro por id inexistente retorna data = null", async ({ request }) => {
    const res = await request.get(`${baseUrl}/financial-transactions/-9999999`);
    expect(res.status()).toBe(200);
    const { data } = await res.json();
    expect(data).toBeNull();
});

test("Criar lancamento financeiro sem campos obrigatorios deve falhar (400)", async ({
    request,
}) => {
    const res = await request.post(`${baseUrl}/financial-transactions`, {
        data: {
            description: "Sem type e value",
        },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.message).toContain(FINANCIAL_TRANSACTION_ERROR.MISSING_FIELDS);
});

test("Criar lancamento financeiro com valor menor ou igual a zero deve falhar (400)", async ({
    request,
}) => {
    const res = await request.post(`${baseUrl}/financial-transactions`, {
        data: {
            type: TransactionType.CREDIT,
            value: 0,
        },
    });
    expect(res.status()).toBe(400);
});

test("Criar lancamento financeiro com type invalido deve falhar (400)", async ({ request }) => {
    const res = await request.post(`${baseUrl}/financial-transactions`, {
        data: {
            type: "INVALID",
            value: 10,
        },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.message).toContain(FINANCIAL_TRANSACTION_ERROR.WRONG_FIELD_VALUE);
});

test("Criar lancamento financeiro com accountsReceivableId inexistente deve falhar (404)", async ({
    request,
}) => {
    const res = await request.post(`${baseUrl}/financial-transactions`, {
        data: {
            type: TransactionType.CREDIT,
            value: 10,
            accountsReceivableId: 9999999,
        },
    });
    expect(res.status()).toBe(404);
});

test("Criar lancamento financeiro com accountsPayableId inexistente deve falhar (404)", async ({
    request,
}) => {
    const res = await request.post(`${baseUrl}/financial-transactions`, {
        data: {
            type: TransactionType.DEBIT,
            value: 10,
            accountsPayableId: 9999999,
        },
    });
    expect(res.status()).toBe(404);
});

test("Atualizar lancamento financeiro inexistente retorna 404", async ({ request }) => {
    const res = await request.put(`${baseUrl}/financial-transactions/9999999`, {
        data: {
            type: TransactionType.CREDIT,
            value: 10,
        },
    });
    expect(res.status()).toBe(404);
});

test("Atualizar lancamento financeiro com valor menor ou igual a zero deve falhar (400)", async ({
    request,
}) => {
    const listRes = await request.get(`${baseUrl}/financial-transactions`);
    const { data: list } = await listRes.json();
    const existing = list.items[0];
    expect(existing).toBeTruthy();

    const res = await request.put(`${baseUrl}/financial-transactions/${existing.id}`, {
        data: {
            type: existing.type,
            value: 0,
            date: new Date().toISOString(),
            category: existing.category,
            description: existing.description,
            accountsReceivableId: existing.accountsReceivableId,
            accountsPayableId: existing.accountsPayableId,
            notes: existing.notes,
        },
    });
    expect(res.status()).toBe(400);
});

test("Atualizar lancamento financeiro com type invalido deve falhar (400)", async ({ request }) => {
    const listRes = await request.get(`${baseUrl}/financial-transactions`);
    const { data: list } = await listRes.json();
    const existing = list.items[0];

    const res = await request.put(`${baseUrl}/financial-transactions/${existing.id}`, {
        data: {
            type: "INVALID",
            value: Number(existing.value),
        },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.message).toContain(FINANCIAL_TRANSACTION_ERROR.WRONG_FIELD_VALUE);
});

test("Atualizar lancamento financeiro com accountsReceivableId inexistente deve falhar (404)", async ({
    request,
}) => {
    const listRes = await request.get(`${baseUrl}/financial-transactions`);
    const { data: list } = await listRes.json();
    const existing = list.items[0];

    const res = await request.put(`${baseUrl}/financial-transactions/${existing.id}`, {
        data: {
            type: existing.type,
            value: Number(existing.value),
            accountsReceivableId: 9999999,
        },
    });
    expect(res.status()).toBe(404);
});

test("Atualizar lancamento financeiro com accountsPayableId inexistente deve falhar (404)", async ({
    request,
}) => {
    const listRes = await request.get(`${baseUrl}/financial-transactions`);
    const { data: list } = await listRes.json();
    const existing = list.items[0];

    const res = await request.put(`${baseUrl}/financial-transactions/${existing.id}`, {
        data: {
            type: existing.type,
            value: Number(existing.value),
            accountsPayableId: 9999999,
        },
    });
    expect(res.status()).toBe(404);
});

test("Busca lancamentos financeiros com search e ordena por date", async ({ request }) => {
    const prefix = `FT_SEARCH_${Date.now().toString().slice(-4)}`;
    const payloads = [
        {
            id: genId(),
            type: TransactionType.CREDIT,
            value: 37.5,
            date: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
            category: `${prefix}_CAT`,
            description: `${prefix} descricao B`,
        },
        {
            id: genId(),
            type: TransactionType.DEBIT,
            value: 15.25,
            date: new Date().toISOString(),
            category: `${prefix}_CAT`,
            description: `${prefix} descricao A`,
        },
    ];

    for (const payload of payloads) {
        const resCreate = await request.post(`${baseUrl}/financial-transactions`, {
            data: payload,
        });
        expect(resCreate.status()).toBe(200);
    }

    const res = await request.get(
        `${baseUrl}/financial-transactions?search=${encodeURIComponent(prefix)}&sortBy=date&sortOrder=asc`
    );
    expect(res.status()).toBe(200);
    const { data } = await res.json();

    const matching = data.items.filter(
        (transaction: { category?: string | null; description?: string | null }) =>
            transaction.category?.includes(prefix) || transaction.description?.includes(prefix)
    );
    expect(matching.length).toBeGreaterThanOrEqual(2);

    const dates = matching.map((transaction: { date: string }) =>
        new Date(transaction.date).getTime()
    );
    const sorted = [...dates].sort((a, b) => a - b);
    expect(dates).toEqual(sorted);
});
