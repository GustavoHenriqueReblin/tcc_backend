import { test, expect } from "@playwright/test";
import { env } from "../src/config/env";
import { PaymentMethod, PaymentStatus } from "@prisma/client";
import { ACCOUNTS_PAYABLE_ERROR } from "../src/middleware/accountsPayableMiddleware";
import { genId } from "./utils/idGenerator";

const baseUrl = `http://${env.DOMAIN}:${env.PORT}/api/v1`;

test("Lista contas a pagar e valida paginacao basica", async ({ request }) => {
    const res = await request.get(`${baseUrl}/accounts-payable`);
    expect(res.status()).toBe(200);
    const { data } = await res.json();

    expect(Array.isArray(data.payables)).toBeTruthy();
    expect(typeof data.meta.total).toBe("number");
    expect(data.meta.page).toBe(1);
    expect(data.payables.length).toBeLessThanOrEqual(10);
});

test("Lista contas a pagar com filtro por status retorna subconjunto", async ({ request }) => {
    const allRes = await request.get(`${baseUrl}/accounts-payable`);
    expect(allRes.status()).toBe(200);
    const { data: all } = await allRes.json();

    const pendingRes = await request.get(
        `${baseUrl}/accounts-payable?status=${PaymentStatus.PENDING}`
    );
    expect(pendingRes.status()).toBe(200);
    const { data: pending } = await pendingRes.json();

    expect(pending.payables.length).toBeLessThanOrEqual(all.payables.length);
});

test("Validacao de query: page/limit invalidos e status invalido", async ({ request }) => {
    const resNumbers = await request.get(`${baseUrl}/accounts-payable?page=abc&limit=xyz`);
    expect(resNumbers.status()).toBe(400);
    const bodyNumbers = await resNumbers.json();
    expect(bodyNumbers.message).toContain(ACCOUNTS_PAYABLE_ERROR.PAGINATION);

    const res = await request.get(`${baseUrl}/accounts-payable?status=INVALID`);
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.message).toContain(ACCOUNTS_PAYABLE_ERROR.INVALID_STATUS);
});

test("Cria, busca e atualiza conta a pagar", async ({ request }) => {
    const supRes = await request.get(`${baseUrl}/suppliers`);
    expect(supRes.status()).toBe(200);
    const { data: slist } = await supRes.json();
    const supplier = slist.suppliers[0];
    expect(supplier).toBeTruthy();

    const purchRes = await request.get(`${baseUrl}/purchase-orders`);
    expect(purchRes.status()).toBe(200);
    const { data: plist } = await purchRes.json();
    const purchaseOrder = plist.orders[0];

    const payload = {
        id: genId(),
        supplierId: supplier.id,
        purchaseOrderId: purchaseOrder?.id ?? null,
        description: "Titulo a pagar de teste",
        value: 321.0,
        dueDate: new Date().toISOString(),
        paymentDate: null,
        method: PaymentMethod.BANK_SLIP,
        status: PaymentStatus.PENDING,
        notes: "Criado via teste automatizado",
    };

    const createRes = await request.post(`${baseUrl}/accounts-payable`, { data: payload });
    expect(createRes.status()).toBe(200);
    const { data: created } = await createRes.json();
    expect(created).toBeTruthy();
    expect(Number(created.value)).toBeCloseTo(321.0, 6);
    expect(created.status).toBe(PaymentStatus.PENDING);

    const getRes = await request.get(`${baseUrl}/accounts-payable/${created.id}`);
    expect(getRes.status()).toBe(200);
    const { data: fetched } = await getRes.json();
    expect(fetched).toBeTruthy();
    expect(fetched.id).toBe(created.id);

    const updateRes = await request.put(`${baseUrl}/accounts-payable/${created.id}`, {
        data: {
            supplierId: created.supplierId,
            purchaseOrderId: created.purchaseOrderId,
            description: "Titulo a pagar atualizado",
            value: 400.5,
            dueDate: new Date().toISOString(),
            paymentDate: new Date().toISOString(),
            method: PaymentMethod.TRANSFER,
            status: PaymentStatus.PAID,
            notes: "Atualizado via teste automatizado",
        },
    });
    expect(updateRes.status()).toBe(200);
    const { data: updated } = await updateRes.json();
    expect(Number(updated.value)).toBeCloseTo(400.5, 6);
    expect(updated.status).toBe(PaymentStatus.PAID);
});

test("Buscar conta a pagar por id inexistente retorna data = null", async ({ request }) => {
    const res = await request.get(`${baseUrl}/accounts-payable/-9999999`);
    expect(res.status()).toBe(200);
    const { data } = await res.json();
    expect(data).toBeNull();
});

test("Criar conta a pagar sem campos obrigatorios deve falhar (400)", async ({ request }) => {
    const res = await request.post(`${baseUrl}/accounts-payable`, {
        data: {
            description: "Sem valor e dueDate",
        },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.message).toContain(ACCOUNTS_PAYABLE_ERROR.MISSING_FIELDS);
});

test("Criar conta a pagar com valor menor ou igual a zero deve falhar (400)", async ({
    request,
}) => {
    const res = await request.post(`${baseUrl}/accounts-payable`, {
        data: {
            value: 0,
            dueDate: new Date().toISOString(),
        },
    });
    expect(res.status()).toBe(400);
});

test("Criar conta a pagar com status e method invalidos deve falhar (400)", async ({ request }) => {
    const res = await request.post(`${baseUrl}/accounts-payable`, {
        data: {
            value: 10,
            dueDate: new Date().toISOString(),
            status: "INVALID",
            method: "INVALID",
        },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.message).toContain(ACCOUNTS_PAYABLE_ERROR.WRONG_FIELD_VALUE);
});

test("Criar conta a pagar com supplierId inexistente deve falhar (404)", async ({ request }) => {
    const res = await request.post(`${baseUrl}/accounts-payable`, {
        data: {
            value: 10,
            dueDate: new Date().toISOString(),
            supplierId: 9999999,
        },
    });
    expect(res.status()).toBe(404);
});

test("Criar conta a pagar com purchaseOrderId inexistente deve falhar (404)", async ({
    request,
}) => {
    const supRes = await request.get(`${baseUrl}/suppliers`);
    const { data: slist } = await supRes.json();
    const supplier = slist.suppliers[0];

    const res = await request.post(`${baseUrl}/accounts-payable`, {
        data: {
            value: 10,
            dueDate: new Date().toISOString(),
            supplierId: supplier.id,
            purchaseOrderId: 9999999,
        },
    });
    expect(res.status()).toBe(404);
});

test("Atualizar conta a pagar inexistente retorna 404", async ({ request }) => {
    const res = await request.put(`${baseUrl}/accounts-payable/9999999`, {
        data: {
            value: 10,
            dueDate: new Date().toISOString(),
        },
    });
    expect(res.status()).toBe(404);
});

test("Atualizar conta a pagar com valor menor ou igual a zero deve falhar (400)", async ({
    request,
}) => {
    const listRes = await request.get(`${baseUrl}/accounts-payable`);
    const { data: list } = await listRes.json();
    const existing = list.payables[0];
    expect(existing).toBeTruthy();

    const res = await request.put(`${baseUrl}/accounts-payable/${existing.id}`, {
        data: {
            supplierId: existing.supplierId,
            purchaseOrderId: existing.purchaseOrderId,
            description: existing.description,
            value: 0,
            dueDate: new Date().toISOString(),
            paymentDate: existing.paymentDate,
            method: existing.method ?? PaymentMethod.BANK_SLIP,
            status: existing.status ?? PaymentStatus.PENDING,
            notes: existing.notes,
        },
    });
    expect(res.status()).toBe(400);
});

test("Atualizar conta a pagar com supplierId inexistente deve falhar (404)", async ({
    request,
}) => {
    const listRes = await request.get(`${baseUrl}/accounts-payable`);
    const { data: list } = await listRes.json();
    const existing = list.payables[0];

    const res = await request.put(`${baseUrl}/accounts-payable/${existing.id}`, {
        data: {
            supplierId: 9999999,
            purchaseOrderId: existing.purchaseOrderId,
            description: existing.description,
            value: Number(existing.value),
            dueDate: new Date().toISOString(),
            paymentDate: existing.paymentDate,
            method: existing.method ?? PaymentMethod.BANK_SLIP,
            status: existing.status ?? PaymentStatus.PENDING,
            notes: existing.notes,
        },
    });
    expect(res.status()).toBe(404);
});

test("Atualizar conta a pagar com purchaseOrderId inexistente deve falhar (404)", async ({
    request,
}) => {
    const listRes = await request.get(`${baseUrl}/accounts-payable`);
    const { data: list } = await listRes.json();
    const existing = list.payables[0];

    const res = await request.put(`${baseUrl}/accounts-payable/${existing.id}`, {
        data: {
            supplierId: existing.supplierId,
            purchaseOrderId: 9999999,
            description: existing.description,
            value: Number(existing.value),
            dueDate: new Date().toISOString(),
            paymentDate: existing.paymentDate,
            method: existing.method ?? PaymentMethod.BANK_SLIP,
            status: existing.status ?? PaymentStatus.PENDING,
            notes: existing.notes,
        },
    });
    expect(res.status()).toBe(404);
});
