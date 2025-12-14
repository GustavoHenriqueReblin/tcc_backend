import { test, expect, APIRequestContext } from "@playwright/test";
import { env } from "../src/config/env";
import { PURCHASE_ORDER_ERROR } from "../src/middleware/purchaseOrder.middleware";
import { OrderStatus, ProductDefinitionType } from "@prisma/client";
import { genId } from "./utils/idGenerator";

const baseUrl = `http://${env.DOMAIN}:${env.PORT}/api/v1`;

const createAuxUnity = async (request: APIRequestContext) => {
    const simbol = `UPO${Math.abs(genId())}`;
    const res = await request.post(`${baseUrl}/unities`, {
        data: { id: genId(), simbol, description: "PO Aux" },
    });
    expect(res.status()).toBe(200);
    const { data } = await res.json();
    return data;
};

const createRawDefinition = async (request: APIRequestContext) => {
    const name = `PD_PO_${Math.abs(genId())}`;
    const res = await request.post(`${baseUrl}/product-definitions`, {
        data: {
            id: genId(),
            name,
            description: "PO Aux",
            type: ProductDefinitionType.RAW_MATERIAL,
        },
    });
    expect(res.status()).toBe(200);
    const { data } = await res.json();
    return data;
};

const createRawProduct = async (request: APIRequestContext, prefix = "RAW_PO") => {
    const unity = await createAuxUnity(request);
    const definition = await createRawDefinition(request);
    const name = `${prefix}_${Math.abs(genId())}`;
    const payload = {
        id: genId(),
        productDefinitionId: definition.id,
        unityId: unity.id,
        name,
        barcode: null,
        inventory: { costValue: 2.5, saleValue: 0, quantity: 100 },
    };
    const res = await request.post(`${baseUrl}/products`, { data: payload });
    expect(res.status()).toBe(200);
    const { data } = await res.json();
    return data;
};

const createAuxWarehouse = async (request: APIRequestContext) => {
    const code = `WH_PO_${Math.abs(genId())}`;
    const res = await request.post(`${baseUrl}/warehouses`, {
        data: { id: genId(), code, name: `Warehouse ${code}`, description: "PO Aux" },
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
    };
};

test("Lista compras e valida paginação", async ({ request }) => {
    const res = await request.get(`${baseUrl}/purchase-orders`);
    expect(res.status()).toBe(200);
    const { data } = await res.json();
    expect(Array.isArray(data.items)).toBeTruthy();
});

test("Filtro status inválido deve retornar 400", async ({ request }) => {
    const res = await request.get(`${baseUrl}/purchase-orders?status=INVALID`);
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.message).toContain(PURCHASE_ORDER_ERROR.INVALID_STATUS);
});

test("Cria, busca e atualiza compra", async ({ request }) => {
    const supRes = await request.get(`${baseUrl}/suppliers?includeInactive=true`);
    expect(supRes.status()).toBe(200);
    const { data: slist } = await supRes.json();
    const supplier = slist.items[0];
    expect(supplier).toBeTruthy();

    const warehouse = await createAuxWarehouse(request);
    const code = `PO${Date.now().toString().slice(-6)}`;
    const createRes = await request.post(`${baseUrl}/purchase-orders`, {
        data: {
            id: genId(),
            code,
            supplierId: supplier.id,
            warehouseId: warehouse.id,
            notes: null,
        },
    });
    expect(createRes.status()).toBe(200);
    const { data: created } = await createRes.json();
    expect(created.code).toBe(code);

    const getRes = await request.get(`${baseUrl}/purchase-orders/${created.id}`);
    expect(getRes.status()).toBe(200);
    const { data: fetched } = await getRes.json();
    expect(fetched.id).toBe(created.id);

    const updRes = await request.put(`${baseUrl}/purchase-orders/${created.id}`, {
        data: {
            status: OrderStatus.RECEIVED,
            notes: "Recebida",
            supplierId: fetched.supplierId,
            code: fetched.code,
            warehouseId: warehouse.id,
        },
    });
    expect(updRes.status()).toBe(200);
    const { data: updated } = await updRes.json();
    expect(updated.status).toBe(OrderStatus.RECEIVED);
});

test("Cadastra e atualiza itens da compra pela rota principal", async ({ request }) => {
    const supRes = await request.get(`${baseUrl}/suppliers?includeInactive=true`);
    const { data: slist } = await supRes.json();
    const supplier = slist.items[0];
    expect(supplier).toBeTruthy();

    const warehouse = await createAuxWarehouse(request);
    const rawA = await createRawProduct(request, "PO_ITEM_A");
    const rawB = await createRawProduct(request, "PO_ITEM_B");
    const rawC = await createRawProduct(request, "PO_ITEM_C");

    const code = `POITEM${Date.now().toString().slice(-6)}`;
    const createRes = await request.post(`${baseUrl}/purchase-orders`, {
        data: {
            id: genId(),
            code,
            supplierId: supplier.id,
            warehouseId: warehouse.id,
            notes: "Compra com itens",
            items: {
                create: [
                    { productId: rawA.id, quantity: 10, unitCost: 5.75 },
                    { productId: rawB.id, quantity: 4.5, unitCost: 2.1 },
                ],
            },
        },
    });
    expect(createRes.status()).toBe(200);
    const { data: created } = await createRes.json();

    const fetchCreated = await request.get(`${baseUrl}/purchase-orders/${created.id}`);
    const { data: createdFull } = await fetchCreated.json();
    const itemA = createdFull.items.find(
        (item: { productId: number }) => item.productId === rawA.id
    );
    const itemB = createdFull.items.find(
        (item: { productId: number }) => item.productId === rawB.id
    );
    expect(itemA).toBeTruthy();
    expect(itemB).toBeTruthy();

    const updateRes = await request.put(`${baseUrl}/purchase-orders/${created.id}`, {
        data: {
            supplierId: created.supplierId,
            code: created.code,
            warehouseId: warehouse.id,
            items: {
                update: [{ id: itemA.id, quantity: 12.5, unitCost: 6 }],
                delete: [itemB.id],
                create: [{ productId: rawC.id, quantity: 3, unitCost: 8.25 }],
            },
        },
    });
    expect(updateRes.status()).toBe(200);

    const verify = await request.get(`${baseUrl}/purchase-orders/${created.id}`);
    const { data: updated } = await verify.json();
    const updatedItemA = updated.items.find(
        (item: { productId: number }) => item.productId === rawA.id
    );
    const deletedItem = updated.items.find(
        (item: { productId: number }) => item.productId === rawB.id
    );
    const addedItem = updated.items.find(
        (item: { productId: number }) => item.productId === rawC.id
    );

    expect(Number(updatedItemA.quantity)).toBeCloseTo(12.5, 4);
    expect(deletedItem).toBeUndefined();
    expect(addedItem).toBeTruthy();
});

test("Criar compra com code duplicado retorna 409", async ({ request }) => {
    const supRes = await request.get(`${baseUrl}/suppliers?includeInactive=true`);
    const { data: slist } = await supRes.json();
    const supplier = slist.items[0];

    const warehouse = await createAuxWarehouse(request);
    const code = `POD${Date.now().toString().slice(-6)}`;
    const res1 = await request.post(`${baseUrl}/purchase-orders`, {
        data: { id: genId(), code, supplierId: supplier.id, warehouseId: warehouse.id },
    });
    expect(res1.status()).toBe(200);
    const res2 = await request.post(`${baseUrl}/purchase-orders`, {
        data: { id: genId(), code, supplierId: supplier.id, warehouseId: warehouse.id },
    });
    expect(res2.status()).toBe(409);
});

test("Busca compras com search por fornecedor e ordena por code", async ({ request }) => {
    const supRes = await request.get(`${baseUrl}/suppliers?includeInactive=true`);
    expect(supRes.status()).toBe(200);
    const { data: slist } = await supRes.json();
    const supplier = slist.items[0];
    expect(supplier).toBeTruthy();

    const sourceName = supplier.person.name || supplier.person.legalName || supplier.person.taxId;
    expect(sourceName).toBeTruthy();
    const searchTerm = sourceName.slice(0, Math.min(4, sourceName.length));

    const codePrefix = `POSRCH_${Date.now().toString().slice(-4)}`;
    const warehouse = await createAuxWarehouse(request);
    const payloads = [
        {
            id: genId(),
            code: `${codePrefix}B`,
            supplierId: supplier.id,
            warehouseId: warehouse.id,
            notes: `${codePrefix}B`,
        },
        {
            id: genId(),
            code: `${codePrefix}A`,
            supplierId: supplier.id,
            warehouseId: warehouse.id,
            notes: `${codePrefix}A`,
        },
    ];

    for (const payload of payloads) {
        const resCreate = await request.post(`${baseUrl}/purchase-orders`, { data: payload });
        expect(resCreate.status()).toBe(200);
    }

    const res = await request.get(
        `${baseUrl}/purchase-orders?search=${encodeURIComponent(searchTerm)}&sortBy=code&sortOrder=asc`
    );
    expect(res.status()).toBe(200);
    const { data } = await res.json();

    const matching = data.items.filter((order: { code: string }) =>
        order.code.startsWith(codePrefix)
    );
    expect(matching.length).toBeGreaterThanOrEqual(2);

    const codes = matching.map((order: { code: string }) => order.code);
    const sorted = [...codes].sort();
    expect(codes).toEqual(sorted);
    expect(
        matching.every((order: { supplier: { person: { name?: string | null } } }) =>
            order.supplier.person.name?.toLowerCase().includes(searchTerm.toLowerCase())
        )
    ).toBeTruthy();
});

test("Compra com itens gera movimento de estoque IN e atualiza saldo", async ({ request }) => {
    const supRes = await request.get(`${baseUrl}/suppliers?includeInactive=true`);
    expect(supRes.status()).toBe(200);
    const { data: slist } = await supRes.json();
    const supplier = slist.items[0];
    expect(supplier).toBeTruthy();

    const warehouse = await createAuxWarehouse(request);
    const raw = await createRawProduct(request, "PO_STOCK_ENTRY");
    const beforeInventory = await getProductInventorySnapshot(request, raw.id);

    const purchaseQty = 27.5;
    const unitCost = 7.35;
    const notes = "Compra com movimento de estoque";
    const code = `PO_STK_${Date.now().toString().slice(-6)}`;

    const createRes = await request.post(`${baseUrl}/purchase-orders`, {
        data: {
            id: genId(),
            code,
            supplierId: supplier.id,
            notes,
            warehouseId: warehouse.id,
            items: {
                create: [{ productId: raw.id, quantity: purchaseQty, unitCost }],
            },
        },
    });
    expect(createRes.status()).toBe(200);
    const { data: created } = await createRes.json();
    expect(created.code).toBe(code);

    const movementRes = await request.get(`${baseUrl}/inventory-movement?productId=${raw.id}`);
    expect(movementRes.status()).toBe(200);
    const { data: movementData } = await movementRes.json();
    const purchaseMovement = movementData.items.find(
        (mv: { reference?: string }) => mv.reference === code
    );
    expect(purchaseMovement).toBeTruthy();
    const latestMovement = purchaseMovement!;
    expect(latestMovement.direction).toBe("IN");
    expect(latestMovement.source).toBe("PURCHASE");
    expect(Number(latestMovement.quantity)).toBeCloseTo(purchaseQty, 6);
    expect(Number(latestMovement.balance)).toBeCloseTo(beforeInventory.quantity + purchaseQty, 6);
    expect(Number(latestMovement.unitCost)).toBeCloseTo(unitCost, 6);
    expect(latestMovement.supplierId).toBe(supplier.id);
    expect(latestMovement.reference).toBe(code);
    expect(latestMovement.notes).toBe(notes);

    const afterInventory = await getProductInventorySnapshot(request, raw.id);
    expect(afterInventory.quantity).toBeCloseTo(beforeInventory.quantity + purchaseQty, 6);
    expect(afterInventory.costValue).toBeCloseTo(unitCost, 6);
});

test("Adicionar item em compra existente cria novo movimento de estoque IN", async ({
    request,
}) => {
    const supRes = await request.get(`${baseUrl}/suppliers?includeInactive=true`);
    expect(supRes.status()).toBe(200);
    const { data: slist } = await supRes.json();
    const supplier = slist.items[0];
    expect(supplier).toBeTruthy();

    const warehouse = await createAuxWarehouse(request);
    const rawBase = await createRawProduct(request, "PO_STOCK_BASE");
    const rawExtra = await createRawProduct(request, "PO_STOCK_EXTRA");

    const baseCode = `PO_STK_UPD_${Date.now().toString().slice(-6)}`;
    const baseNotes = "Compra base";
    const baseQty = 8.25;
    const baseUnitCost = 4.8;

    const createRes = await request.post(`${baseUrl}/purchase-orders`, {
        data: {
            id: genId(),
            code: baseCode,
            supplierId: supplier.id,
            notes: baseNotes,
            warehouseId: warehouse.id,
            items: {
                create: [{ productId: rawBase.id, quantity: baseQty, unitCost: baseUnitCost }],
            },
        },
    });
    expect(createRes.status()).toBe(200);
    const { data: created } = await createRes.json();
    expect(created.id).toBeTruthy();

    const extraBeforeInventory = await getProductInventorySnapshot(request, rawExtra.id);
    const extraQty = 14.25;
    const extraUnitCost = 6.55;
    const updateNotes = "Compra com itens extras";

    const updateRes = await request.put(`${baseUrl}/purchase-orders/${created.id}`, {
        data: {
            supplierId: supplier.id,
            code: baseCode,
            notes: updateNotes,
            warehouseId: warehouse.id,
            items: {
                create: [{ productId: rawExtra.id, quantity: extraQty, unitCost: extraUnitCost }],
            },
        },
    });
    expect(updateRes.status()).toBe(200);

    const movementRes = await request.get(`${baseUrl}/inventory-movement?productId=${rawExtra.id}`);
    expect(movementRes.status()).toBe(200);
    const { data: movementData } = await movementRes.json();
    const additionMovement = movementData.items.find(
        (mv: { reference?: string }) => mv.reference === baseCode
    );
    expect(additionMovement).toBeTruthy();
    const latestAddition = additionMovement!;
    expect(latestAddition.direction).toBe("IN");
    expect(latestAddition.source).toBe("PURCHASE");
    expect(Number(latestAddition.quantity)).toBeCloseTo(extraQty, 6);
    expect(Number(latestAddition.balance)).toBeCloseTo(extraBeforeInventory.quantity + extraQty, 6);
    expect(Number(latestAddition.unitCost)).toBeCloseTo(extraUnitCost, 6);
    expect(latestAddition.supplierId).toBe(supplier.id);
    expect(latestAddition.reference).toBe(baseCode);
    expect(latestAddition.notes).toBe(updateNotes);

    const extraAfterInventory = await getProductInventorySnapshot(request, rawExtra.id);
    expect(extraAfterInventory.quantity).toBeCloseTo(extraBeforeInventory.quantity + extraQty, 6);
    expect(extraAfterInventory.costValue).toBeCloseTo(extraUnitCost, 6);
});
