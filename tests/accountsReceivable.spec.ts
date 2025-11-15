import { test, expect } from "@playwright/test";
import { env } from "../src/config/env";
import { PaymentMethod, PaymentStatus } from "@prisma/client";
import { ACCOUNTS_RECEIVABLE_ERROR } from "../src/middleware/accountsReceivableMiddleware";
import { genId } from "./utils/idGenerator";

const baseUrl = `http://${env.DOMAIN}:${env.PORT}/api/v1`;

test("Lista contas a receber e valida paginação básica", async ({ request }) => {
    const res = await request.get(`${baseUrl}/accounts-receivable`);
    expect(res.status()).toBe(200);
    const { data } = await res.json();

    expect(Array.isArray(data.receivables)).toBeTruthy();
    expect(typeof data.meta.total).toBe("number");
    expect(data.meta.page).toBe(1);
    expect(data.receivables.length).toBeLessThanOrEqual(10);
});

test("Filtro status inválido deve retornar 400", async ({ request }) => {
    const res = await request.get(`${baseUrl}/accounts-receivable?status=INVALID`);
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.message).toContain(ACCOUNTS_RECEIVABLE_ERROR.INVALID_STATUS);
});

test("Cria, busca e atualiza conta a receber", async ({ request }) => {
    const custRes = await request.get(`${baseUrl}/customers`);
    expect(custRes.status()).toBe(200);
    const { data: clist } = await custRes.json();
    const customer = clist.customers[0];
    expect(customer).toBeTruthy();

    const saleRes = await request.get(`${baseUrl}/sale-orders`);
    expect(saleRes.status()).toBe(200);
    const { data: slist } = await saleRes.json();
    const saleOrder = slist.orders[0];

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
