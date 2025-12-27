import { test, expect } from "@playwright/test";
import { env } from "../src/config/env";
import { PaymentMethod, PaymentStatus } from "@prisma/client";
import { ACCOUNTS_RECEIVABLE_ERROR } from "../src/middleware/accountsReceivable.middleware";
import { genId } from "./utils/idGenerator";

const baseUrl = `http://localhost:${env.PORT}/api/v1`;

test("Lista contas a receber e valida paginacao basica", async ({ request }) => {
    const res = await request.get(`${baseUrl}/accounts-receivable`);
    expect(res.status()).toBe(200);
    const { data } = await res.json();

    expect(Array.isArray(data.items)).toBeTruthy();
    expect(typeof data.meta.total).toBe("number");
    expect(data.meta.page).toBe(1);
    expect(data.items.length).toBeLessThanOrEqual(10);
});

test("Lista contas a receber com filtro por status retorna subconjunto", async ({ request }) => {
    const allRes = await request.get(`${baseUrl}/accounts-receivable`);
    expect(allRes.status()).toBe(200);
    const { data: all } = await allRes.json();

    const pendingRes = await request.get(
        `${baseUrl}/accounts-receivable?status=${PaymentStatus.PENDING}`
    );
    expect(pendingRes.status()).toBe(200);
    const { data: pending } = await pendingRes.json();

    expect(pending.items.length).toBeLessThanOrEqual(all.items.length);
});

test("Validacao de query: page/limit invalidos e status invalido", async ({ request }) => {
    const resNumbers = await request.get(`${baseUrl}/accounts-receivable?page=abc&limit=xyz`);
    expect(resNumbers.status()).toBe(400);
    const bodyNumbers = await resNumbers.json();
    expect(bodyNumbers.message).toContain(ACCOUNTS_RECEIVABLE_ERROR.PAGINATION);

    const res = await request.get(`${baseUrl}/accounts-receivable?status=INVALID`);
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.message).toContain(ACCOUNTS_RECEIVABLE_ERROR.INVALID_STATUS);
});

test("Cria, busca e atualiza conta a receber", async ({ request }) => {
    const custRes = await request.get(`${baseUrl}/customers`);
    expect(custRes.status()).toBe(200);
    const { data: clist } = await custRes.json();
    const customer = clist.items[0];
    expect(customer).toBeTruthy();

    const saleRes = await request.get(`${baseUrl}/sale-orders`);
    expect(saleRes.status()).toBe(200);
    const { data: slist } = await saleRes.json();
    const saleOrder = slist.items[0];

    const payload = {
        id: genId(),
        customerId: customer.id,
        saleOrderId: saleOrder?.id ?? null,
        description: "Parcela de teste",
        value: 123.45,
        dueDate: new Date().toISOString(),
        paymentDate: null,
        method: PaymentMethod.PIX,
        status: PaymentStatus.PENDING,
        notes: "Criada via teste automatizado",
    };

    const createRes = await request.post(`${baseUrl}/accounts-receivable`, { data: payload });
    expect(createRes.status()).toBe(200);
    const { data: created } = await createRes.json();
    expect(created).toBeTruthy();
    expect(Number(created.value)).toBeCloseTo(123.45, 6);
    expect(created.status).toBe(PaymentStatus.PENDING);

    const getRes = await request.get(`${baseUrl}/accounts-receivable/${created.id}`);
    expect(getRes.status()).toBe(200);
    const { data: fetched } = await getRes.json();
    expect(fetched).toBeTruthy();
    expect(fetched.id).toBe(created.id);

    const updateRes = await request.put(`${baseUrl}/accounts-receivable/${created.id}`, {
        data: {
            customerId: created.customerId,
            saleOrderId: created.saleOrderId,
            description: "Parcela atualizada",
            value: 200.0,
            dueDate: new Date().toISOString(),
            paymentDate: new Date().toISOString(),
            method: PaymentMethod.CARD,
            status: PaymentStatus.PAID,
            notes: "Atualizada via teste automatizado",
        },
    });
    expect(updateRes.status()).toBe(200);
    const { data: updated } = await updateRes.json();
    expect(Number(updated.value)).toBeCloseTo(200.0, 6);
    expect(updated.status).toBe(PaymentStatus.PAID);
});

test("Buscar conta a receber por id inexistente retorna data = null", async ({ request }) => {
    const res = await request.get(`${baseUrl}/accounts-receivable/-9999999`);
    expect(res.status()).toBe(200);
    const { data } = await res.json();
    expect(data).toBeNull();
});

test("Criar conta a receber sem campos obrigatorios deve falhar (400)", async ({ request }) => {
    const res = await request.post(`${baseUrl}/accounts-receivable`, {
        data: {
            description: "Sem valor e dueDate",
        },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.message).toContain(ACCOUNTS_RECEIVABLE_ERROR.MISSING_FIELDS);
});

test("Criar conta a receber com valor menor ou igual a zero deve falhar (400)", async ({
    request,
}) => {
    const res = await request.post(`${baseUrl}/accounts-receivable`, {
        data: {
            value: 0,
            dueDate: new Date().toISOString(),
        },
    });
    expect(res.status()).toBe(400);
});

test("Criar conta a receber com status e method invalidos deve falhar (400)", async ({
    request,
}) => {
    const res = await request.post(`${baseUrl}/accounts-receivable`, {
        data: {
            value: 10,
            dueDate: new Date().toISOString(),
            status: "INVALID",
            method: "INVALID",
        },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.message).toContain(ACCOUNTS_RECEIVABLE_ERROR.WRONG_FIELD_VALUE);
});

test("Criar conta a receber com customerId inexistente deve falhar (404)", async ({ request }) => {
    const res = await request.post(`${baseUrl}/accounts-receivable`, {
        data: {
            value: 10,
            dueDate: new Date().toISOString(),
            customerId: 9999999,
        },
    });
    expect(res.status()).toBe(404);
});

test("Criar conta a receber com saleOrderId inexistente deve falhar (404)", async ({ request }) => {
    const custRes = await request.get(`${baseUrl}/customers`);
    const { data: clist } = await custRes.json();
    const customer = clist.items[0];

    const res = await request.post(`${baseUrl}/accounts-receivable`, {
        data: {
            value: 10,
            dueDate: new Date().toISOString(),
            customerId: customer.id,
            saleOrderId: 9999999,
        },
    });
    expect(res.status()).toBe(404);
});

test("Atualizar conta a receber inexistente retorna 404", async ({ request }) => {
    const res = await request.put(`${baseUrl}/accounts-receivable/9999999`, {
        data: {
            value: 10,
            dueDate: new Date().toISOString(),
        },
    });
    expect(res.status()).toBe(404);
});

test("Atualizar conta a receber com valor menor ou igual a zero deve falhar (400)", async ({
    request,
}) => {
    const listRes = await request.get(`${baseUrl}/accounts-receivable`);
    const { data: list } = await listRes.json();
    const existing = list.items[0];
    expect(existing).toBeTruthy();

    const res = await request.put(`${baseUrl}/accounts-receivable/${existing.id}`, {
        data: {
            customerId: existing.customerId,
            saleOrderId: existing.saleOrderId,
            description: existing.description,
            value: 0,
            dueDate: new Date().toISOString(),
            paymentDate: existing.paymentDate,
            method: existing.method ?? PaymentMethod.PIX,
            status: existing.status ?? PaymentStatus.PENDING,
            notes: existing.notes,
        },
    });
    expect(res.status()).toBe(400);
});

test("Atualizar conta a receber com customerId inexistente deve falhar (404)", async ({
    request,
}) => {
    const listRes = await request.get(`${baseUrl}/accounts-receivable`);
    const { data: list } = await listRes.json();
    const existing = list.items[0];

    const res = await request.put(`${baseUrl}/accounts-receivable/${existing.id}`, {
        data: {
            customerId: 9999999,
            saleOrderId: existing.saleOrderId,
            description: existing.description,
            value: Number(existing.value),
            dueDate: new Date().toISOString(),
            paymentDate: existing.paymentDate,
            method: existing.method ?? PaymentMethod.PIX,
            status: existing.status ?? PaymentStatus.PENDING,
            notes: existing.notes,
        },
    });
    expect(res.status()).toBe(404);
});

test("Atualizar conta a receber com saleOrderId inexistente deve falhar (404)", async ({
    request,
}) => {
    const listRes = await request.get(`${baseUrl}/accounts-receivable`);
    const { data: list } = await listRes.json();
    const existing = list.items[0];

    const res = await request.put(`${baseUrl}/accounts-receivable/${existing.id}`, {
        data: {
            customerId: existing.customerId,
            saleOrderId: 9999999,
            description: existing.description,
            value: Number(existing.value),
            dueDate: new Date().toISOString(),
            paymentDate: existing.paymentDate,
            method: existing.method ?? PaymentMethod.PIX,
            status: existing.status ?? PaymentStatus.PENDING,
            notes: existing.notes,
        },
    });
    expect(res.status()).toBe(404);
});

test("Busca contas a receber com search e ordena por value", async ({ request }) => {
    const custRes = await request.get(`${baseUrl}/customers`);
    expect(custRes.status()).toBe(200);
    const { data: clist } = await custRes.json();
    const customer = clist.items[0];
    expect(customer).toBeTruthy();

    const saleRes = await request.get(`${baseUrl}/sale-orders`);
    expect(saleRes.status()).toBe(200);
    const { data: slist } = await saleRes.json();
    const saleOrder = slist.items[0];

    const prefix = `AR_SEARCH_${Date.now().toString().slice(-4)}`;
    const payloads = [
        {
            id: genId(),
            customerId: customer.id,
            saleOrderId: saleOrder?.id ?? null,
            description: `${prefix}B`,
            value: 75.25,
            dueDate: new Date().toISOString(),
        },
        {
            id: genId(),
            customerId: customer.id,
            saleOrderId: saleOrder?.id ?? null,
            description: `${prefix}A`,
            value: 40.1,
            dueDate: new Date().toISOString(),
        },
    ];

    for (const payload of payloads) {
        const resCreate = await request.post(`${baseUrl}/accounts-receivable`, { data: payload });
        expect(resCreate.status()).toBe(200);
    }

    const res = await request.get(
        `${baseUrl}/accounts-receivable?search=${encodeURIComponent(prefix)}&sortBy=value&sortOrder=asc`
    );
    expect(res.status()).toBe(200);
    const { data } = await res.json();

    const matching = data.items.filter((receivable: { description?: string | null }) =>
        receivable.description?.includes(prefix)
    );
    expect(matching.length).toBeGreaterThanOrEqual(2);

    const values = matching.map((receivable: { value: string }) => Number(receivable.value));
    const sorted = [...values].sort((a, b) => a - b);
    expect(values).toEqual(sorted);
});
