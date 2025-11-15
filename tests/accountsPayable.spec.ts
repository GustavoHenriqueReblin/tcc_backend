import { test, expect } from "@playwright/test";
import { env } from "../src/config/env";
import { PaymentMethod, PaymentStatus } from "@prisma/client";
import { ACCOUNTS_PAYABLE_ERROR } from "../src/middleware/accountsPayableMiddleware";
import { genId } from "./utils/idGenerator";

const baseUrl = `http://${env.DOMAIN}:${env.PORT}/api/v1`;

test("Lista contas a pagar e valida paginação básica", async ({ request }) => {
    const res = await request.get(`${baseUrl}/accounts-payable`);
    expect(res.status()).toBe(200);
    const { data } = await res.json();

    expect(Array.isArray(data.payables)).toBeTruthy();
    expect(typeof data.meta.total).toBe("number");
    expect(data.meta.page).toBe(1);
    expect(data.payables.length).toBeLessThanOrEqual(10);
});

test("Filtro status inválido deve retornar 400", async ({ request }) => {
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
        description: "Título a pagar de teste",
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
            description: "Título a pagar atualizado",
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
