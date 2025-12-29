import { test, expect, APIRequestContext } from "@playwright/test";
import { SALE_ORDER_ERROR } from "../src/middleware/saleOrder.middleware";
import { OrderStatus, ProductDefinitionType } from "@prisma/client";
import { genId } from "./utils/idGenerator";

const baseUrl = `http://localhost:${process.env.PORT ?? "3333"}/api/v1`;

const createAuxUnity = async (request: APIRequestContext) => {
    const simbol = `USO${Math.abs(genId())}`;
    const res = await request.post(`${baseUrl}/unities`, {
        data: { id: genId(), simbol, description: "SO Aux" },
    });
    expect(res.status()).toBe(200);
    const { data } = await res.json();
    return data;
};

const findDefinitionByType = async (request: APIRequestContext, type: ProductDefinitionType) => {
    const res = await request.get(`${baseUrl}/product-definitions?type=${type}`);
    expect(res.status()).toBe(200);
    const { data } = await res.json();
    return data.items.find((pd: { type: ProductDefinitionType }) => pd.type === type) ?? null;
};

const createAuxDefinition = async (request: APIRequestContext) => {
    const existing = await findDefinitionByType(request, ProductDefinitionType.FINISHED_PRODUCT);
    if (existing) return existing;

    const name = `PD_SO_${Math.abs(genId())}`;
    const res = await request.post(`${baseUrl}/product-definitions`, {
        data: {
            id: genId(),
            name,
            description: "SO Aux",
            type: ProductDefinitionType.FINISHED_PRODUCT,
        },
    });
    expect(res.status()).toBe(200);
    const { data } = await res.json();
    return data;
};

const createSaleProduct = async (request: APIRequestContext, prefix = "PROD_SO") => {
    const unity = await createAuxUnity(request);
    const definition = await createAuxDefinition(request);
    const name = `${prefix}_${Math.abs(genId())}`;
    const payload = {
        id: genId(),
        productDefinitionId: definition.id,
        unityId: unity.id,
        name,
        barcode: null,
        inventory: { costValue: 5.5, saleValue: 12.75, quantity: 10 },
    };
    const res = await request.post(`${baseUrl}/products`, { data: payload });
    expect(res.status()).toBe(200);
    const { data } = await res.json();
    return data;
};

const createAuxWarehouse = async (request: APIRequestContext) => {
    const code = `WH_SO_${Math.abs(genId())}`;
    const res = await request.post(`${baseUrl}/warehouses`, {
        data: { id: genId(), code, name: `Warehouse ${code}`, description: "SO Aux" },
    });
    expect(res.status()).toBe(200);
    const { data } = await res.json();
    return data;
};

const getProductInventorySnapshot = async (request: APIRequestContext, productId: number) => {
    const res = await request.get(`${baseUrl}/products/${productId}`);
    expect(res.status()).toBe(200);
    const { data } = await res.json();
    const inventory = data.productInventory?.[0];
    expect(inventory).toBeTruthy();
    return {
        quantity: Number(inventory.quantity),
        costValue: Number(inventory.costValue),
        saleValue: Number(inventory.saleValue),
    };
};

test("Lista pedidos de venda e valida paginaÇõÇœo", async ({ request }) => {
    const res = await request.get(`${baseUrl}/sale-orders`);
    expect(res.status()).toBe(200);
    const { data } = await res.json();
    expect(Array.isArray(data.items)).toBeTruthy();
    expect(typeof data.meta.total).toBe("number");
});

test("Filtro status invÇ­lido deve retornar 400", async ({ request }) => {
    const res = await request.get(`${baseUrl}/sale-orders?status=INVALID`);
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.message).toContain(SALE_ORDER_ERROR.INVALID_STATUS);
});

test("Cria, busca e atualiza pedido de venda", async ({ request }) => {
    const custRes = await request.get(`${baseUrl}/customers`);
    expect(custRes.status()).toBe(200);
    const { data: clist } = await custRes.json();
    const customer = clist.items[0];
    expect(customer).toBeTruthy();

    const code = `SO${Date.now().toString().slice(-6)}`;
    const createRes = await request.post(`${baseUrl}/sale-orders`, {
        data: { id: genId(), code, customerId: customer.id, totalValue: 100.5, notes: null },
    });
    expect(createRes.status()).toBe(200);
    const { data: created } = await createRes.json();
    expect(created.code).toBe(code);

    const getRes = await request.get(`${baseUrl}/sale-orders/${created.id}`);
    expect(getRes.status()).toBe(200);
    const { data: fetched } = await getRes.json();
    expect(fetched.id).toBe(created.id);

    const updRes = await request.put(`${baseUrl}/sale-orders/${created.id}`, {
        data: {
            status: OrderStatus.APPROVED,
            totalValue: 150.75,
            customerId: fetched.customerId,
            code: fetched.code,
        },
    });
    expect(updRes.status()).toBe(200);
    const { data: updated } = await updRes.json();
    expect(updated.status).toBe(OrderStatus.APPROVED);
});

test("Permite cadastrar e atualizar itens pelo endpoint principal", async ({ request }) => {
    const custRes = await request.get(`${baseUrl}/customers`);
    const { data: clist } = await custRes.json();
    const customer = clist.items[0];
    expect(customer).toBeTruthy();

    const productA = await createSaleProduct(request, "SO_ITEM_A");
    const productB = await createSaleProduct(request, "SO_ITEM_B");
    const productC = await createSaleProduct(request, "SO_ITEM_C");

    const code = `SOITEM${Date.now().toString().slice(-6)}`;
    const createRes = await request.post(`${baseUrl}/sale-orders`, {
        data: {
            id: genId(),
            code,
            customerId: customer.id,
            totalValue: 250,
            items: {
                create: [
                    {
                        productId: productA.id,
                        quantity: 1.25,
                        unitPrice: 10.5,
                        productUnitPrice: 10.5,
                        unitCost: 4.25,
                    },
                    {
                        productId: productB.id,
                        quantity: 2,
                        unitPrice: 15.75,
                        productUnitPrice: 15.75,
                        unitCost: 6.5,
                    },
                ],
            },
        },
    });
    expect(createRes.status()).toBe(200);
    const { data: created } = await createRes.json();

    const fetchCreated = await request.get(`${baseUrl}/sale-orders/${created.id}`);
    const { data: createdFull } = await fetchCreated.json();
    const itemA = createdFull.items.find(
        (item: { productId: number }) => item.productId === productA.id
    );
    const itemB = createdFull.items.find(
        (item: { productId: number }) => item.productId === productB.id
    );
    expect(itemA).toBeTruthy();
    expect(itemB).toBeTruthy();

    const updateRes = await request.put(`${baseUrl}/sale-orders/${created.id}`, {
        data: {
            customerId: created.customerId,
            code: created.code,
            totalValue: 320,
            items: {
                update: [
                    {
                        id: itemA.id,
                        quantity: 3,
                        unitPrice: 12.25,
                        productUnitPrice: 12.25,
                        unitCost: 5,
                    },
                ],
                delete: [itemB.id],
                create: [
                    {
                        productId: productC.id,
                        quantity: 1,
                        unitPrice: 22,
                        productUnitPrice: 22,
                        unitCost: 9,
                    },
                ],
            },
        },
    });
    expect(updateRes.status()).toBe(200);

    const verify = await request.get(`${baseUrl}/sale-orders/${created.id}`);
    const { data: updated } = await verify.json();
    const updatedItemA = updated.items.find(
        (item: { productId: number }) => item.productId === productA.id
    );
    const deletedItem = updated.items.find(
        (item: { productId: number }) => item.productId === productB.id
    );
    const addedItem = updated.items.find(
        (item: { productId: number }) => item.productId === productC.id
    );

    expect(Number(updatedItemA.quantity)).toBeCloseTo(3, 4);
    expect(deletedItem).toBeUndefined();
    expect(addedItem).toBeTruthy();
});

test("Criar pedido com code duplicado retorna 409", async ({ request }) => {
    const custRes = await request.get(`${baseUrl}/customers`);
    const { data: clist } = await custRes.json();
    const customer = clist.items[0];

    const code = `SOD${Date.now().toString().slice(-6)}`;
    const res1 = await request.post(`${baseUrl}/sale-orders`, {
        data: { id: genId(), code, customerId: customer.id, totalValue: 10 },
    });
    expect(res1.status()).toBe(200);
    const res2 = await request.post(`${baseUrl}/sale-orders`, {
        data: { id: genId(), code, customerId: customer.id, totalValue: 20 },
    });
    expect(res2.status()).toBe(409);
});

test("Busca pedidos de venda com search e ordena por totalValue", async ({ request }) => {
    const custRes = await request.get(`${baseUrl}/customers`);
    expect(custRes.status()).toBe(200);
    const { data: clist } = await custRes.json();
    const customer = clist.items[0];
    expect(customer).toBeTruthy();

    const sourceName = customer.person.name || customer.person.legalName || customer.person.taxId;
    expect(sourceName).toBeTruthy();
    const searchTerm = sourceName.slice(0, Math.min(4, sourceName.length));

    const codePrefix = `SOSRCH_${Date.now().toString().slice(-4)}`;
    const payloads = [
        { id: genId(), code: `${codePrefix}B`, customerId: customer.id, totalValue: 75.5 },
        { id: genId(), code: `${codePrefix}A`, customerId: customer.id, totalValue: 12.25 },
    ];

    for (const payload of payloads) {
        const resCreate = await request.post(`${baseUrl}/sale-orders`, { data: payload });
        expect(resCreate.status()).toBe(200);
    }

    const res = await request.get(
        `${baseUrl}/sale-orders?search=${encodeURIComponent(searchTerm)}&sortBy=totalValue&sortOrder=asc`
    );
    expect(res.status()).toBe(200);
    const { data } = await res.json();

    const matching = data.items.filter((order: { code: string }) =>
        order.code.startsWith(codePrefix)
    );
    expect(matching.length).toBeGreaterThanOrEqual(2);

    const totals = matching.map((order: { totalValue: string }) => Number(order.totalValue));
    const sorted = [...totals].sort((a, b) => a - b);
    expect(totals).toEqual(sorted);
    expect(
        matching.every(
            (order: { code: string; customer: { person: { name?: string | null } } }) =>
                order.code.startsWith(codePrefix) ||
                order.customer.person.name?.toLowerCase().includes(searchTerm.toLowerCase())
        )
    ).toBeTruthy();
});

test("Pedido FINISHED gera movimento de estoque OUT com custo e venda corretos", async ({
    request,
}) => {
    const custRes = await request.get(`${baseUrl}/customers`);
    expect(custRes.status()).toBe(200);
    const { data: clist } = await custRes.json();
    const customer = clist.items[0];
    expect(customer).toBeTruthy();

    // Garante que há um depósito disponível para a movimentação de saída
    const warehouse = await createAuxWarehouse(request);

    const product = await createSaleProduct(request, "SO_STK");
    const beforeInventory = await getProductInventorySnapshot(request, product.id);

    const saleQty = 2.75;
    const unitPrice = 15.25;
    const unitCost = beforeInventory.costValue;
    const code = `SO_STK_${Date.now().toString().slice(-6)}`;

    const createRes = await request.post(`${baseUrl}/sale-orders`, {
        data: {
            id: genId(),
            code,
            customerId: customer.id,
            warehouseId: warehouse.id,
            status: OrderStatus.FINISHED,
            totalValue: saleQty * unitPrice,
            notes: "Venda finalizada com movimento de estoque",
            items: {
                create: [
                    {
                        productId: product.id,
                        quantity: saleQty,
                        unitPrice,
                        productUnitPrice: unitPrice,
                        unitCost,
                    },
                ],
            },
        },
    });
    expect(createRes.status()).toBe(200);

    const movementRes = await request.get(`${baseUrl}/inventory-movement?productId=${product.id}`);
    expect(movementRes.status()).toBe(200);
    const { data: movementData } = await movementRes.json();
    const saleMovement = movementData.items.find(
        (mv: { reference?: string }) => mv.reference === code
    );
    expect(saleMovement).toBeTruthy();
    expect(saleMovement.direction).toBe("OUT");
    expect(saleMovement.source).toBe("SALE");
    expect(Number(saleMovement.quantity)).toBeCloseTo(saleQty, 6);
    expect(Number(saleMovement.balance)).toBeCloseTo(beforeInventory.quantity - saleQty, 6);
    expect(Number(saleMovement.unitCost)).toBeCloseTo(unitCost, 6);
    expect(Number(saleMovement.saleValue)).toBeCloseTo(unitPrice, 6);
    expect(saleMovement.reference).toBe(code);

    const afterInventory = await getProductInventorySnapshot(request, product.id);
    expect(afterInventory.quantity).toBeCloseTo(beforeInventory.quantity - saleQty, 6);
    expect(afterInventory.costValue).toBeCloseTo(beforeInventory.costValue, 6);
    expect(afterInventory.saleValue).toBeCloseTo(beforeInventory.saleValue, 6);
});
