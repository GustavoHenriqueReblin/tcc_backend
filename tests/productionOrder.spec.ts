import { test, expect, APIRequestContext } from "@playwright/test";
import { PRODUCTION_ORDER_ERROR } from "../src/middleware/productionOrder.middleware";
import { ProductDefinitionType, ProductionOrderStatus } from "@prisma/client";
import { genId } from "./utils/idGenerator";

const baseUrl = `http://localhost:${process.env.PORT ?? "3333"}/api/v1`;

const createAuxUnity = async (request: APIRequestContext) => {
    const simbol = `U${Date.now().toString().slice(-6)}`;
    const res = await request.post(`${baseUrl}/unities`, {
        data: { id: genId(), simbol, description: "Aux" },
    });
    expect(res.status()).toBe(200);
    const { data } = await res.json();
    return data;
};

const createAuxWarehouse = async (request: APIRequestContext) => {
    const code = `WH_PO_${Date.now().toString().slice(-6)}`;
    const res = await request.post(`${baseUrl}/warehouses`, {
        data: { id: genId(), code, name: `Warehouse ${code}`, description: "Aux" },
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

const createAuxDefinition = async (
    request: APIRequestContext,
    type: ProductDefinitionType = ProductDefinitionType.FINISHED_PRODUCT
) => {
    const existing = await findDefinitionByType(request, type);
    if (existing) return existing;

    const name = `PD_${type}_${Date.now().toString().slice(-6)}`;
    const res = await request.post(`${baseUrl}/product-definitions`, {
        data: {
            id: genId(),
            name,
            description: "Aux",
            type,
        },
    });
    expect(res.status()).toBe(200);
    const { data } = await res.json();
    return data;
};

const createAuxProduct = async (
    request: APIRequestContext,
    type: ProductDefinitionType = ProductDefinitionType.FINISHED_PRODUCT,
    namePrefix = "PROD_PO",
    inventoryOverride?: { costValue: number; saleValue: number; quantity: number }
) => {
    const unity = await createAuxUnity(request);
    const def = await createAuxDefinition(request, type);
    const nameBase = `${namePrefix}_${Date.now().toString().slice(-6)}`;
    const payload = {
        id: genId(),
        productDefinitionId: def.id,
        unityId: unity.id,
        name: nameBase,
        barcode: null,
        inventory: { costValue: 4.44, saleValue: 8.88, quantity: 10, ...inventoryOverride },
    };
    const res = await request.post(`${baseUrl}/products`, { data: payload });
    expect(res.status()).toBe(200);
    const { data } = await res.json();
    return data;
};

const createAuxRecipe = async (request: APIRequestContext) => {
    const product = await createAuxProduct(request);
    const res = await request.post(`${baseUrl}/recipes`, {
        data: {
            id: genId(),
            productId: product.id,
            description: "Receita auxiliar para production order",
            notes: null,
        },
    });
    expect(res.status()).toBe(200);
    const { data } = await res.json();
    return { recipe: data, product };
};

const createRecipeForProduct = async (
    request: APIRequestContext,
    productId: number,
    description = "Receita auxiliar para production order"
) => {
    const res = await request.post(`${baseUrl}/recipes`, {
        data: { id: genId(), productId, description, notes: null },
    });
    expect(res.status()).toBe(200);
    const { data } = await res.json();
    return data;
};

const getInventorySnapshot = async (request: APIRequestContext, productId: number) => {
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

test("Lista ordens de producao com paginacao basica", async ({ request }) => {
    const res = await request.get(`${baseUrl}/production-orders`);
    expect(res.status()).toBe(200);
    const { data } = await res.json();
    expect(Array.isArray(data.items)).toBeTruthy();
});

test("Validacao de query: status invalido", async ({ request }) => {
    const res = await request.get(`${baseUrl}/production-orders?status=INVALID`);
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.message).toContain(PRODUCTION_ORDER_ERROR.INVALID_STATUS);
});

test("Validacao de id, paginacao e ordenacao de production order", async ({ request }) => {
    const resInvalidId = await request.get(`${baseUrl}/production-orders/not-a-number`);
    expect(resInvalidId.status()).toBe(400);
    const bodyInvalidId = await resInvalidId.json();
    expect(bodyInvalidId.message).toContain(PRODUCTION_ORDER_ERROR.ID);

    const resInvalidPagination = await request.get(
        `${baseUrl}/production-orders?page=abc&limit=xyz`
    );
    expect(resInvalidPagination.status()).toBe(400);
    const bodyInvalidPagination = await resInvalidPagination.json();
    expect(bodyInvalidPagination.message).toContain(PRODUCTION_ORDER_ERROR.PAGINATION);

    const resInvalidSortOrder = await request.get(
        `${baseUrl}/production-orders?sortOrder=ascending`
    );
    expect(resInvalidSortOrder.status()).toBe(400);
    const bodyInvalidSortOrder = await resInvalidSortOrder.json();
    expect(bodyInvalidSortOrder.message).toContain(PRODUCTION_ORDER_ERROR.SORT);

    const resInvalidSortBy = await request.get(`${baseUrl}/production-orders?sortBy=unknown`);
    expect(resInvalidSortBy.status()).toBe(400);
    const bodyInvalidSortBy = await resInvalidSortBy.json();
    expect(bodyInvalidSortBy.message).toContain(PRODUCTION_ORDER_ERROR.SORT_BY);
});

test("Validacao de filtros productId e datas em production order", async ({ request }) => {
    const resInvalidProduct = await request.get(`${baseUrl}/production-orders?productId=abc`);
    expect(resInvalidProduct.status()).toBe(400);
    const bodyInvalidProduct = await resInvalidProduct.json();
    expect(bodyInvalidProduct.message).toContain(PRODUCTION_ORDER_ERROR.INVALID_PRODUCT);

    const resInvalidStartDate = await request.get(
        `${baseUrl}/production-orders?startDateFrom=data-invalida`
    );
    expect(resInvalidStartDate.status()).toBe(400);
    const bodyInvalidStartDate = await resInvalidStartDate.json();
    expect(bodyInvalidStartDate.message).toContain(PRODUCTION_ORDER_ERROR.INVALID_START_DATE);

    const resInvalidEndDate = await request.get(
        `${baseUrl}/production-orders?endDateTo=data-invalida`
    );
    expect(resInvalidEndDate.status()).toBe(400);
    const bodyInvalidEndDate = await resInvalidEndDate.json();
    expect(bodyInvalidEndDate.message).toContain(PRODUCTION_ORDER_ERROR.INVALID_END_DATE);

    const resInvalidRange = await request.get(
        `${baseUrl}/production-orders?startDateFrom=2024-05-10T00:00:00.000Z&startDateTo=2024-05-01T00:00:00.000Z`
    );
    expect(resInvalidRange.status()).toBe(400);
    const bodyInvalidRange = await resInvalidRange.json();
    expect(bodyInvalidRange.message).toContain(PRODUCTION_ORDER_ERROR.INVALID_PERIOD_RANGE);
});

test("Valida startDate e endDate na criacao e atualizacao da ordem", async ({ request }) => {
    const { recipe } = await createAuxRecipe(request);
    const warehouse = await createAuxWarehouse(request);

    const now = Date.now();
    const startDate = new Date(now).toISOString();
    const invalidEndDate = new Date(now - 60 * 60 * 1000).toISOString();
    const validEndDate = new Date(now + 60 * 60 * 1000).toISOString();
    const codeBase = `PODATE${now.toString().slice(-6)}`;

    const invalidCreate = await request.post(`${baseUrl}/production-orders`, {
        data: {
            id: genId(),
            code: `${codeBase}_INV`,
            recipeId: recipe.id,
            warehouseId: warehouse.id,
            plannedQty: 5,
            startDate,
            endDate: invalidEndDate,
        },
    });
    expect(invalidCreate.status()).toBe(400);
    const invalidCreateBody = await invalidCreate.json();
    expect(invalidCreateBody.message).toContain(PRODUCTION_ORDER_ERROR.END_DATE_BEFORE_START);

    const createRes = await request.post(`${baseUrl}/production-orders`, {
        data: {
            id: genId(),
            code: `${codeBase}_OK`,
            recipeId: recipe.id,
            warehouseId: warehouse.id,
            plannedQty: 5,
            startDate,
            endDate: validEndDate,
        },
    });
    expect(createRes.status()).toBe(200);
    const { data: created } = await createRes.json();

    const invalidUpdate = await request.put(`${baseUrl}/production-orders/${created.id}`, {
        data: {
            code: created.code,
            recipeId: created.recipeId,
            warehouseId: created.warehouseId,
            plannedQty: Number(created.plannedQty),
            startDate,
            endDate: invalidEndDate,
        },
    });
    expect(invalidUpdate.status()).toBe(400);
    const invalidUpdateBody = await invalidUpdate.json();
    expect(invalidUpdateBody.message).toContain(PRODUCTION_ORDER_ERROR.END_DATE_BEFORE_START);
});

test("Cria, busca e atualiza ordem de producao", async ({ request }) => {
    const { recipe } = await createAuxRecipe(request);
    const warehouse = await createAuxWarehouse(request);
    const code = `PRD${Date.now().toString().slice(-6)}`;
    const createRes = await request.post(`${baseUrl}/production-orders`, {
        data: {
            id: genId(),
            code,
            recipeId: recipe.id,
            warehouseId: warehouse.id,
            plannedQty: 50.5,
            notes: null,
            otherCosts: 12.34,
        },
    });
    expect(createRes.status()).toBe(200);
    const { data: created } = await createRes.json();
    expect(created.code).toBe(code);
    expect(created.recipeId).toBe(recipe.id);
    expect(Number(created.otherCosts)).toBeCloseTo(12.34, 4);

    const getRes = await request.get(`${baseUrl}/production-orders/${created.id}`);
    expect(getRes.status()).toBe(200);
    const { data: fetched } = await getRes.json();
    expect(fetched.id).toBe(created.id);
    expect(fetched.recipeId).toBe(recipe.id);
    expect(Number(fetched.otherCosts)).toBeCloseTo(12.34, 4);

    const updRes = await request.put(`${baseUrl}/production-orders/${created.id}`, {
        data: {
            status: ProductionOrderStatus.RUNNING,
            plannedQty: 60,
            code: fetched.code,
            recipeId: fetched.recipeId,
            warehouseId: fetched.warehouseId,
            otherCosts: 0,
        },
    });
    expect(updRes.status()).toBe(200);
    const { data: updated } = await updRes.json();
    expect(updated.status).toBe(ProductionOrderStatus.RUNNING);
    expect(Number(updated.otherCosts)).toBe(0);
});

test("Permite cadastrar e atualizar inputs pelo endpoint principal", async ({ request }) => {
    const { recipe } = await createAuxRecipe(request);
    const warehouse = await createAuxWarehouse(request);

    const inputA = await createAuxProduct(
        request,
        ProductDefinitionType.RAW_MATERIAL,
        "RAW_PO_IN_A"
    );
    const inputB = await createAuxProduct(
        request,
        ProductDefinitionType.RAW_MATERIAL,
        "RAW_PO_IN_B"
    );
    const inputC = await createAuxProduct(
        request,
        ProductDefinitionType.RAW_MATERIAL,
        "RAW_PO_IN_C"
    );

    const code = `POIN${Date.now().toString().slice(-6)}`;
    const createRes = await request.post(`${baseUrl}/production-orders`, {
        data: {
            id: genId(),
            code,
            recipeId: recipe.id,
            warehouseId: warehouse.id,
            plannedQty: 25,
            inputs: {
                create: [
                    { productId: inputA.id, quantity: 5.5, unitCost: 2.25 },
                    { productId: inputB.id, quantity: 3.75, unitCost: 1.8 },
                ],
            },
        },
    });
    expect(createRes.status()).toBe(200);
    const { data: created } = await createRes.json();

    const fetchCreated = await request.get(`${baseUrl}/production-orders/${created.id}`);
    expect(fetchCreated.status()).toBe(200);
    const { data: createdFull } = await fetchCreated.json();

    const createdInputA = createdFull.inputs.find(
        (item: { productId: number }) => item.productId === inputA.id
    );
    const createdInputB = createdFull.inputs.find(
        (item: { productId: number }) => item.productId === inputB.id
    );

    expect(createdInputA).toBeTruthy();
    expect(createdInputB).toBeTruthy();

    const updateRes = await request.put(`${baseUrl}/production-orders/${created.id}`, {
        data: {
            code: createdFull.code,
            recipeId: createdFull.recipeId,
            warehouseId: warehouse.id,
            plannedQty: Number(createdFull.plannedQty),
            status: createdFull.status,
            inputs: {
                update: [
                    {
                        id: createdInputA.id,
                        quantity: 6.25,
                        unitCost: 2.35,
                    },
                ],
                delete: [createdInputB.id],
                create: [{ productId: inputC.id, quantity: 2.5, unitCost: 3.1 }],
            },
        },
    });
    expect(updateRes.status()).toBe(200);

    const verifyRes = await request.get(`${baseUrl}/production-orders/${created.id}`);
    expect(verifyRes.status()).toBe(200);
    const { data: updated } = await verifyRes.json();

    const updatedA = updated.inputs.find(
        (item: { productId: number }) => item.productId === inputA.id
    );
    const deletedB = updated.inputs.find(
        (item: { productId: number }) => item.productId === inputB.id
    );
    const addedC = updated.inputs.find(
        (item: { productId: number }) => item.productId === inputC.id
    );

    expect(Number(updatedA.quantity)).toBeCloseTo(6.25, 4);
    expect(deletedB).toBeUndefined();
    expect(addedC).toBeTruthy();
});

test("Finaliza ordem de producao movimentando estoque e custos", async ({ request }) => {
    const warehouse = await createAuxWarehouse(request);

    const finishedInitialQty = 1;
    const finishedInitialCost = 2.5;
    const finishedProduct = await createAuxProduct(
        request,
        ProductDefinitionType.FINISHED_PRODUCT,
        "PROD_FIN",
        { costValue: finishedInitialCost, saleValue: 12.5, quantity: finishedInitialQty }
    );
    const recipe = await createRecipeForProduct(
        request,
        finishedProduct.id,
        "Receita para finalizacao"
    );

    const rawAUnitCost = 5;
    const rawAQtyPerUnit = 0.5;
    const rawAInitialQty = 10;
    const rawA = await createAuxProduct(request, ProductDefinitionType.RAW_MATERIAL, "RAW_FIN_A", {
        costValue: rawAUnitCost,
        saleValue: 0,
        quantity: rawAInitialQty,
    });

    const rawBUnitCost = 3.25;
    const rawBQtyPerUnit = 0.25;
    const rawBInitialQty = 6;
    const rawB = await createAuxProduct(request, ProductDefinitionType.RAW_MATERIAL, "RAW_FIN_B", {
        costValue: rawBUnitCost,
        saleValue: 0,
        quantity: rawBInitialQty,
    });

    const producedQty = 4;
    const plannedQty = producedQty;
    const otherCosts = 10.5;
    const code = `POFIN${Date.now().toString().slice(-6)}`;

    const createRes = await request.post(`${baseUrl}/production-orders`, {
        data: {
            id: genId(),
            code,
            recipeId: recipe.id,
            warehouseId: warehouse.id,
            plannedQty,
            otherCosts,
            inputs: {
                create: [
                    { productId: rawA.id, quantity: rawAQtyPerUnit, unitCost: rawAUnitCost },
                    { productId: rawB.id, quantity: rawBQtyPerUnit, unitCost: rawBUnitCost },
                ],
            },
        },
    });
    expect(createRes.status()).toBe(200);
    const { data: created } = await createRes.json();

    const finalizeRes = await request.put(`${baseUrl}/production-orders/${created.id}`, {
        data: {
            code: created.code,
            recipeId: created.recipeId,
            warehouseId: warehouse.id,
            plannedQty,
            producedQty,
            status: ProductionOrderStatus.FINISHED,
            otherCosts,
        },
    });
    expect(finalizeRes.status()).toBe(200);
    const { data: finalized } = await finalizeRes.json();
    expect(finalized.status).toBe(ProductionOrderStatus.FINISHED);
    expect(Number(finalized.producedQty)).toBeCloseTo(producedQty, 4);

    const expectedRawABalance = rawAInitialQty - rawAQtyPerUnit * producedQty;
    const expectedRawBBalance = rawBInitialQty - rawBQtyPerUnit * producedQty;
    const totalProductionCost =
        rawAQtyPerUnit * producedQty * rawAUnitCost +
        rawBQtyPerUnit * producedQty * rawBUnitCost +
        otherCosts;
    const productionUnitCost = totalProductionCost / producedQty;
    const expectedFinishedQty = finishedInitialQty + producedQty;
    const expectedFinishedCost =
        (finishedInitialQty * finishedInitialCost + producedQty * productionUnitCost) /
        expectedFinishedQty;

    const rawASnapshot = await getInventorySnapshot(request, rawA.id);
    const rawBSnapshot = await getInventorySnapshot(request, rawB.id);
    const finishedSnapshot = await getInventorySnapshot(request, finishedProduct.id);

    expect(rawASnapshot.quantity).toBeCloseTo(expectedRawABalance, 4);
    expect(rawBSnapshot.quantity).toBeCloseTo(expectedRawBBalance, 4);
    expect(rawASnapshot.costValue).toBeCloseTo(rawAUnitCost, 4);
    expect(rawBSnapshot.costValue).toBeCloseTo(rawBUnitCost, 4);
    expect(finishedSnapshot.quantity).toBeCloseTo(expectedFinishedQty, 4);
    expect(finishedSnapshot.costValue).toBeCloseTo(expectedFinishedCost, 4);

    const rawAMovementsRes = await request.get(
        `${baseUrl}/inventory-movement?productId=${rawA.id}`
    );
    expect(rawAMovementsRes.status()).toBe(200);
    const { data: rawAMovements } = await rawAMovementsRes.json();
    const rawAOut = rawAMovements.items.find(
        (mv: { reference: string; direction: string }) =>
            mv.reference === `OP ${code}` && mv.direction === "OUT"
    );
    expect(rawAOut).toBeTruthy();
    expect(rawAOut.productionOrderId).toBe(created.id);
    expect(Number(rawAOut.quantity)).toBeCloseTo(rawAQtyPerUnit * producedQty, 4);
    expect(Number(rawAOut.balance)).toBeCloseTo(expectedRawABalance, 4);
    expect(Number(rawAOut.unitCost)).toBeCloseTo(rawAUnitCost, 4);

    const rawBMovementsRes = await request.get(
        `${baseUrl}/inventory-movement?productId=${rawB.id}`
    );
    expect(rawBMovementsRes.status()).toBe(200);
    const { data: rawBMovements } = await rawBMovementsRes.json();
    const rawBOut = rawBMovements.items.find(
        (mv: { reference: string; direction: string }) =>
            mv.reference === `OP ${code}` && mv.direction === "OUT"
    );
    expect(rawBOut).toBeTruthy();
    expect(rawBOut.productionOrderId).toBe(created.id);
    expect(Number(rawBOut.quantity)).toBeCloseTo(rawBQtyPerUnit * producedQty, 4);
    expect(Number(rawBOut.balance)).toBeCloseTo(expectedRawBBalance, 4);
    expect(Number(rawBOut.unitCost)).toBeCloseTo(rawBUnitCost, 4);

    const finishedMovementsRes = await request.get(
        `${baseUrl}/inventory-movement?productId=${finishedProduct.id}`
    );
    expect(finishedMovementsRes.status()).toBe(200);
    const { data: finishedMovements } = await finishedMovementsRes.json();
    const prodIn = finishedMovements.items.find(
        (mv: { reference: string; direction: string }) =>
            mv.reference === `OP ${code}` && mv.direction === "IN"
    );
    expect(prodIn).toBeTruthy();
    expect(prodIn.productionOrderId).toBe(created.id);
    expect(Number(prodIn.quantity)).toBeCloseTo(producedQty, 4);
    expect(Number(prodIn.balance)).toBeCloseTo(expectedFinishedQty, 4);
    expect(Number(prodIn.unitCost)).toBeCloseTo(productionUnitCost, 4);
});

test("Cancelar ordem FINISHED estorna produto final e devolve insumos via ajuste", async ({
    request,
}) => {
    const warehouse = await createAuxWarehouse(request);

    const finishedInitialQty = 3.25;
    const finishedInitialCost = 3.75;
    const finishedProduct = await createAuxProduct(
        request,
        ProductDefinitionType.FINISHED_PRODUCT,
        "PROD_FIN_CANCEL",
        { costValue: finishedInitialCost, saleValue: 14.5, quantity: finishedInitialQty }
    );
    const recipe = await createRecipeForProduct(
        request,
        finishedProduct.id,
        "Receita para cancelamento"
    );

    const rawAUnitCost = 4.1;
    const rawAQtyPerUnit = 0.6;
    const rawAInitialQty = 12;
    const rawA = await createAuxProduct(request, ProductDefinitionType.RAW_MATERIAL, "RAW_CAN_A", {
        costValue: rawAUnitCost,
        saleValue: 0,
        quantity: rawAInitialQty,
    });

    const rawBUnitCost = 2.35;
    const rawBQtyPerUnit = 0.4;
    const rawBInitialQty = 9.5;
    const rawB = await createAuxProduct(request, ProductDefinitionType.RAW_MATERIAL, "RAW_CAN_B", {
        costValue: rawBUnitCost,
        saleValue: 0,
        quantity: rawBInitialQty,
    });

    const producedQty = 2.5;
    const code = `POCANCEL${Date.now().toString().slice(-6)}`;

    const createRes = await request.post(`${baseUrl}/production-orders`, {
        data: {
            id: genId(),
            code,
            recipeId: recipe.id,
            warehouseId: warehouse.id,
            plannedQty: producedQty,
            inputs: {
                create: [
                    { productId: rawA.id, quantity: rawAQtyPerUnit, unitCost: rawAUnitCost },
                    { productId: rawB.id, quantity: rawBQtyPerUnit, unitCost: rawBUnitCost },
                ],
            },
        },
    });
    expect(createRes.status()).toBe(200);
    const { data: created } = await createRes.json();

    const finalizeRes = await request.put(`${baseUrl}/production-orders/${created.id}`, {
        data: {
            code: created.code,
            recipeId: created.recipeId,
            warehouseId: warehouse.id,
            plannedQty: producedQty,
            producedQty,
            status: ProductionOrderStatus.FINISHED,
        },
    });
    expect(finalizeRes.status()).toBe(200);

    const beforeCancelFinished = await getInventorySnapshot(request, finishedProduct.id);
    const beforeCancelRawA = await getInventorySnapshot(request, rawA.id);
    const beforeCancelRawB = await getInventorySnapshot(request, rawB.id);

    expect(beforeCancelFinished.quantity).toBeCloseTo(finishedInitialQty + producedQty, 4);
    expect(beforeCancelRawA.quantity).toBeCloseTo(rawAInitialQty - rawAQtyPerUnit * producedQty, 4);
    expect(beforeCancelRawB.quantity).toBeCloseTo(rawBInitialQty - rawBQtyPerUnit * producedQty, 4);

    const cancelRes = await request.put(`${baseUrl}/production-orders/${created.id}`, {
        data: {
            code: created.code,
            recipeId: created.recipeId,
            warehouseId: warehouse.id,
            plannedQty: producedQty,
            producedQty,
            status: ProductionOrderStatus.CANCELED,
        },
    });
    expect(cancelRes.status()).toBe(200);

    const finishedMovementsRes = await request.get(
        `${baseUrl}/inventory-movement?productId=${finishedProduct.id}`
    );
    expect(finishedMovementsRes.status()).toBe(200);
    const { data: finishedMovements } = await finishedMovementsRes.json();
    const adjustmentOut = finishedMovements.items.find(
        (mv: { reference: string; source: string; direction: string }) =>
            mv.reference === `OP ${code}` && mv.source === "PRODUCTION" && mv.direction === "OUT"
    );
    expect(adjustmentOut).toBeTruthy();
    expect(adjustmentOut.productionOrderId).toBe(created.id);
    expect(Number(adjustmentOut.quantity)).toBeCloseTo(producedQty, 4);

    const rawAMovementsRes = await request.get(
        `${baseUrl}/inventory-movement?productId=${rawA.id}`
    );
    expect(rawAMovementsRes.status()).toBe(200);
    const { data: rawAMovements } = await rawAMovementsRes.json();
    const adjustmentInA = rawAMovements.items.find(
        (mv: { reference: string; source: string; direction: string }) =>
            mv.reference === `OP ${code}` && mv.source === "PRODUCTION" && mv.direction === "IN"
    );
    expect(adjustmentInA).toBeTruthy();
    expect(adjustmentInA.productionOrderId).toBe(created.id);
    expect(Number(adjustmentInA.quantity)).toBeCloseTo(rawAQtyPerUnit * producedQty, 4);

    const rawBMovementsRes = await request.get(
        `${baseUrl}/inventory-movement?productId=${rawB.id}`
    );
    expect(rawBMovementsRes.status()).toBe(200);
    const { data: rawBMovements } = await rawBMovementsRes.json();
    const adjustmentInB = rawBMovements.items.find(
        (mv: { reference: string; source: string; direction: string }) =>
            mv.reference === `OP ${code}` && mv.source === "PRODUCTION" && mv.direction === "IN"
    );
    expect(adjustmentInB).toBeTruthy();
    expect(adjustmentInB.productionOrderId).toBe(created.id);
    expect(Number(adjustmentInB.quantity)).toBeCloseTo(rawBQtyPerUnit * producedQty, 4);

    const afterCancelFinished = await getInventorySnapshot(request, finishedProduct.id);
    const afterCancelRawA = await getInventorySnapshot(request, rawA.id);
    const afterCancelRawB = await getInventorySnapshot(request, rawB.id);

    expect(afterCancelFinished.quantity).toBeCloseTo(finishedInitialQty, 4);
    expect(afterCancelRawA.quantity).toBeCloseTo(rawAInitialQty, 4);
    expect(afterCancelRawB.quantity).toBeCloseTo(rawBInitialQty, 4);
    expect(afterCancelRawA.costValue).toBeCloseTo(rawAUnitCost, 4);
    expect(afterCancelRawB.costValue).toBeCloseTo(rawBUnitCost, 4);
});

test("Busca e ordenacao de production orders por produto", async ({ request }) => {
    const { recipe, product } = await createAuxRecipe(request);
    const warehouse = await createAuxWarehouse(request);
    const code = `PRSRCH${Date.now().toString().slice(-6)}`;

    const createRes = await request.post(`${baseUrl}/production-orders`, {
        data: {
            id: genId(),
            code,
            recipeId: recipe.id,
            warehouseId: warehouse.id,
            plannedQty: 15.5,
        },
    });
    expect(createRes.status()).toBe(200);

    const searchTerm = (product.name as string).slice(0, 3);
    const resSearch = await request.get(
        `${baseUrl}/production-orders?search=${encodeURIComponent(searchTerm)}&sortBy=createdAt&sortOrder=asc`
    );
    expect(resSearch.status()).toBe(200);
    const { data: searchData } = await resSearch.json();
    expect(searchData.items.length).toBeGreaterThan(0);

    const matching = searchData.items.filter(
        (order: { code: string; recipe: { product: { name: string; barcode?: string | null } } }) =>
            order.code === code ||
            order.recipe.product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            order.recipe.product.barcode?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    expect(matching.length).toBeGreaterThan(0);

    const createdDates = searchData.items.map((o: { createdAt: string }) =>
        new Date(o.createdAt).getTime()
    );
    const sortedDates = [...createdDates].sort((a, b) => a - b);
    expect(createdDates).toEqual(sortedDates);
});

test("Filtra production orders por productId e periodo de datas", async ({ request }) => {
    const warehouse = await createAuxWarehouse(request);
    const { recipe, product } = await createAuxRecipe(request);

    const startInRange = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
    const endInRange = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString();
    const startOutRange = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString();
    const endOutRange = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();

    const resInRange = await request.post(`${baseUrl}/production-orders`, {
        data: {
            id: genId(),
            code: `POPER${Date.now().toString().slice(-6)}`,
            recipeId: recipe.id,
            warehouseId: warehouse.id,
            plannedQty: 12,
            startDate: startInRange,
            endDate: endInRange,
        },
    });
    expect(resInRange.status()).toBe(200);
    const { data: orderInRange } = await resInRange.json();

    const resOutRange = await request.post(`${baseUrl}/production-orders`, {
        data: {
            id: genId(),
            code: `POPER${(Date.now() + 1).toString().slice(-6)}`,
            recipeId: recipe.id,
            warehouseId: warehouse.id,
            plannedQty: 8,
            startDate: startOutRange,
            endDate: endOutRange,
            status: ProductionOrderStatus.RUNNING,
        },
    });
    expect(resOutRange.status()).toBe(200);
    const { data: orderOutRange } = await resOutRange.json();

    const startFromFilter = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
    const startToFilter = new Date(Date.now()).toISOString();
    const endFromFilter = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
    const endToFilter = new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString();

    const filterRes = await request.get(
        `${baseUrl}/production-orders?productId=${product.id}&status=${ProductionOrderStatus.PLANNED}&startDateFrom=${encodeURIComponent(
            startFromFilter
        )}&startDateTo=${encodeURIComponent(startToFilter)}&endDateFrom=${encodeURIComponent(
            endFromFilter
        )}&endDateTo=${encodeURIComponent(endToFilter)}`
    );
    expect(filterRes.status()).toBe(200);
    const { data: filtered } = await filterRes.json();

    expect(filtered.items.length).toBeGreaterThan(0);
    expect(
        filtered.items.find((order: { id: number }) => order.id === orderOutRange.id)
    ).toBeUndefined();
    expect(
        filtered.items.find((order: { id: number }) => order.id === orderInRange.id)
    ).toBeTruthy();

    filtered.items.forEach(
        (order: { productId: number; startDate: string; endDate: string; status: string }) => {
            expect(order.productId).toBe(product.id);
            expect(order.status).toBe(ProductionOrderStatus.PLANNED);
            expect(new Date(order.startDate).getTime()).toBeGreaterThanOrEqual(
                new Date(startFromFilter).getTime()
            );
            expect(new Date(order.startDate).getTime()).toBeLessThanOrEqual(
                new Date(startToFilter).getTime()
            );
            expect(new Date(order.endDate).getTime()).toBeGreaterThanOrEqual(
                new Date(endFromFilter).getTime()
            );
            expect(new Date(order.endDate).getTime()).toBeLessThanOrEqual(
                new Date(endToFilter).getTime()
            );
        }
    );
});

test("Criar ordem com code duplicado retorna 409", async ({ request }) => {
    const { recipe } = await createAuxRecipe(request);
    const warehouse = await createAuxWarehouse(request);
    const code = `PDUP${Date.now().toString().slice(-6)}`;
    const res1 = await request.post(`${baseUrl}/production-orders`, {
        data: {
            id: genId(),
            code,
            recipeId: recipe.id,
            warehouseId: warehouse.id,
            plannedQty: 10,
        },
    });
    expect(res1.status()).toBe(200);
    const res2 = await request.post(`${baseUrl}/production-orders`, {
        data: {
            id: genId(),
            code,
            recipeId: recipe.id,
            warehouseId: warehouse.id,
            plannedQty: 11,
        },
    });
    expect(res2.status()).toBe(409);
});
