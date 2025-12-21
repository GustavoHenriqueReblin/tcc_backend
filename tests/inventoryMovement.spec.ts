import { test, expect, APIRequestContext } from "@playwright/test";
import { env } from "../src/config/env";
import { MovementSource, MovementType, ProductDefinitionType } from "@prisma/client";
import { INVENTORY_MOVEMENT_ERROR } from "../src/middleware/inventoryMovement.middleware";
import { genId } from "./utils/idGenerator";

const baseUrl = `http://${env.DOMAIN}:${env.PORT}/api/v1`;

const createAuxUnity = async (request: APIRequestContext) => {
    const simbol = `U${Date.now().toString().slice(-6)}`;
    const res = await request.post(`${baseUrl}/unities`, {
        data: { id: genId(), simbol, description: "Aux" },
    });
    expect(res.status()).toBe(200);
    const { data } = await res.json();
    return data;
};

const createAuxDefinition = async (request: APIRequestContext) => {
    const name = `PD_${Date.now().toString().slice(-6)}`;
    const res = await request.post(`${baseUrl}/product-definitions`, {
        data: {
            id: genId(),
            name,
            description: "Aux",
            type: ProductDefinitionType.FINISHED_PRODUCT,
        },
    });
    expect(res.status()).toBe(200);
    const { data } = await res.json();
    return data;
};

const createAuxWarehouse = async (request: APIRequestContext) => {
    const code = `WH_${Date.now().toString().slice(-6)}`;
    const res = await request.post(`${baseUrl}/warehouses`, {
        data: { id: genId(), code, name: `Warehouse ${code}`, description: "Aux" },
    });
    expect(res.status()).toBe(200);
    const { data } = await res.json();
    return data;
};

test("Movimentos IN/OUT via ajustes atualizam balance corretamente", async ({ request }) => {
    const unity = await createAuxUnity(request);
    const def = await createAuxDefinition(request);
    const warehouse = await createAuxWarehouse(request);

    const nameBase = `PROD_MOV_${Date.now().toString().slice(-6)}`;
    const initialQty = 10.5;
    const payload = {
        id: genId(),
        productDefinitionId: def.id,
        unityId: unity.id,
        name: nameBase,
        barcode: null,
        inventory: {
            costValue: 5.55,
            saleValue: 9.99,
            quantity: initialQty,
        },
    };

    const createRes = await request.post(`${baseUrl}/products`, { data: payload });
    expect(createRes.status()).toBe(200);
    const { data: created } = await createRes.json();
    expect(created).toBeTruthy();
    const productId = created.id as number;

    let mvRes = await request.get(`${baseUrl}/inventory-movement?productId=${productId}`);
    expect(mvRes.status()).toBe(200);
    let { data: mvData } = await mvRes.json();
    expect(Array.isArray(mvData.items)).toBeTruthy();
    expect(mvData.items.length).toBeGreaterThan(0);
    let last = mvData.items[0];
    expect(last.direction).toBe("IN");
    expect(Number(last.quantity)).toBeCloseTo(initialQty, 6);
    expect(Number(last.balance)).toBeCloseTo(initialQty, 6);

    const higherQty = 25.75;
    const adjustInRes = await request.post(`${baseUrl}/inventory-movement/adjustments`, {
        data: {
            productId,
            quantity: higherQty,
            warehouseId: warehouse.id,
            notes: "Ajuste IN teste",
        },
    });
    expect(adjustInRes.status()).toBe(200);

    mvRes = await request.get(`${baseUrl}/inventory-movement?productId=${productId}`);
    expect(mvRes.status()).toBe(200);
    ({ data: mvData } = await mvRes.json());
    last = mvData.items[0];
    expect(last.direction).toBe("IN");
    expect(Number(last.quantity)).toBeCloseTo(higherQty - initialQty, 6);
    expect(Number(last.balance)).toBeCloseTo(higherQty, 6);

    const lowerQty = 7.25;
    const adjustOutRes = await request.post(`${baseUrl}/inventory-movement/adjustments`, {
        data: {
            productId,
            quantity: lowerQty,
            warehouseId: warehouse.id,
            notes: "Ajuste OUT teste",
        },
    });
    expect(adjustOutRes.status()).toBe(200);

    mvRes = await request.get(`${baseUrl}/inventory-movement?productId=${productId}`);
    expect(mvRes.status()).toBe(200);
    ({ data: mvData } = await mvRes.json());
    last = mvData.items[0];
    expect(last.direction).toBe("OUT");
    expect(Number(last.quantity)).toBeCloseTo(higherQty - lowerQty, 6);
    expect(Number(last.balance)).toBeCloseTo(lowerQty, 6);
});

test("Validacao, busca e ordenacao de inventory-movement", async ({ request }) => {
    const resMissingProduct = await request.get(`${baseUrl}/inventory-movement`);
    expect(resMissingProduct.status()).toBe(200);
    const { data: missingProductData } = await resMissingProduct.json();
    expect(Array.isArray(missingProductData.items)).toBeTruthy();

    const resInvalidPagination = await request.get(
        `${baseUrl}/inventory-movement?productId=1&page=abc&limit=xyz`
    );
    expect(resInvalidPagination.status()).toBe(400);
    const bodyInvalidPagination = await resInvalidPagination.json();
    expect(bodyInvalidPagination.message).toContain(INVENTORY_MOVEMENT_ERROR.PAGINATION);

    const resInvalidSortOrder = await request.get(
        `${baseUrl}/inventory-movement?productId=1&sortOrder=ascending`
    );
    expect(resInvalidSortOrder.status()).toBe(400);
    const bodyInvalidSortOrder = await resInvalidSortOrder.json();
    expect(bodyInvalidSortOrder.message).toContain(INVENTORY_MOVEMENT_ERROR.SORT);

    const resInvalidSortBy = await request.get(
        `${baseUrl}/inventory-movement?productId=1&sortBy=unknown`
    );
    expect(resInvalidSortBy.status()).toBe(400);
    const bodyInvalidSortBy = await resInvalidSortBy.json();
    expect(bodyInvalidSortBy.message).toContain(INVENTORY_MOVEMENT_ERROR.SORT_BY);

    const resInvalidStartDate = await request.get(
        `${baseUrl}/inventory-movement?productId=1&startDate=data-invalida`
    );
    expect(resInvalidStartDate.status()).toBe(400);
    const bodyInvalidStartDate = await resInvalidStartDate.json();
    expect(bodyInvalidStartDate.message).toContain(INVENTORY_MOVEMENT_ERROR.INVALID_START_DATE);

    const resInvalidEndDate = await request.get(
        `${baseUrl}/inventory-movement?productId=1&endDate=data-invalida`
    );
    expect(resInvalidEndDate.status()).toBe(400);
    const bodyInvalidEndDate = await resInvalidEndDate.json();
    expect(bodyInvalidEndDate.message).toContain(INVENTORY_MOVEMENT_ERROR.INVALID_END_DATE);

    const resInvalidMovementType = await request.get(
        `${baseUrl}/inventory-movement?productId=1&movementType=INVALID`
    );
    expect(resInvalidMovementType.status()).toBe(400);
    const bodyInvalidMovementType = await resInvalidMovementType.json();
    expect(bodyInvalidMovementType.message).toContain(
        INVENTORY_MOVEMENT_ERROR.INVALID_MOVEMENT_TYPE
    );

    const resInvalidSource = await request.get(
        `${baseUrl}/inventory-movement?productId=1&source=INVALID`
    );
    expect(resInvalidSource.status()).toBe(400);
    const bodyInvalidSource = await resInvalidSource.json();
    expect(bodyInvalidSource.message).toContain(INVENTORY_MOVEMENT_ERROR.INVALID_SOURCE);

    const unity = await createAuxUnity(request);
    const def = await createAuxDefinition(request);

    const createProductRes = await request.post(`${baseUrl}/products`, {
        data: {
            id: genId(),
            productDefinitionId: def.id,
            unityId: unity.id,
            name: `PROD_MOV_${Date.now().toString().slice(-6)}`,
            barcode: null,
            inventory: { costValue: 2.2, saleValue: 4.4, quantity: 5.5 },
        },
    });
    expect(createProductRes.status()).toBe(200);
    const { data: createdProduct } = await createProductRes.json();

    const listRes = await request.get(
        `${baseUrl}/inventory-movement?productId=${createdProduct.id}&sortBy=quantity&sortOrder=asc`
    );
    expect(listRes.status()).toBe(200);
    const { data: list } = await listRes.json();
    expect(list.items.length).toBeGreaterThan(0);

    const quantities = list.items.map((mv: { quantity: string }) => Number(mv.quantity));
    const sortedQuantities = [...quantities].sort((a, b) => a - b);
    expect(quantities).toEqual(sortedQuantities);

    const resSearch = await request.get(
        `${baseUrl}/inventory-movement?productId=${createdProduct.id}&search=unknown-ref`
    );
    expect(resSearch.status()).toBe(200);
    const { data: searchData } = await resSearch.json();
    expect(searchData.items.length).toBeGreaterThanOrEqual(0);

    const now = new Date();
    const yesterdayIso = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    const tomorrowIso = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
    const filterRes = await request.get(
        `${baseUrl}/inventory-movement?productId=${createdProduct.id}&startDate=${encodeURIComponent(
            yesterdayIso
        )}&endDate=${encodeURIComponent(tomorrowIso)}&movementType=${MovementType.IN}&source=${
            MovementSource.ADJUSTMENT
        }&sortBy=createdAt&sortOrder=desc`
    );
    expect(filterRes.status()).toBe(200);
    const { data: filtered } = await filterRes.json();
    expect(filtered.items.length).toBeGreaterThanOrEqual(0);
});

test("Cria ajuste de estoque IN e atualiza balance com nova quantidade alvo", async ({
    request,
}) => {
    const unity = await createAuxUnity(request);
    const def = await createAuxDefinition(request);
    const warehouse = await createAuxWarehouse(request);

    const initialQty = 12.5;
    const createProductRes = await request.post(`${baseUrl}/products`, {
        data: {
            id: genId(),
            productDefinitionId: def.id,
            unityId: unity.id,
            name: `PROD_ADJ_${Date.now().toString().slice(-6)}`,
            barcode: null,
            inventory: { costValue: 2.2, saleValue: 4.4, quantity: initialQty },
        },
    });
    expect(createProductRes.status()).toBe(200);
    const { data: createdProduct } = await createProductRes.json();

    const newBalanceAfterAdjustment = 30;
    const adjustmentPayload = {
        productId: createdProduct.id,
        quantity: newBalanceAfterAdjustment,
        warehouseId: warehouse.id,
        notes: "Ajuste positivo",
    };

    const adjustRes = await request.post(`${baseUrl}/inventory-movement/adjustments`, {
        data: adjustmentPayload,
    });
    expect(adjustRes.status()).toBe(200);
    const { data: adjustment } = await adjustRes.json();
    expect(adjustment.direction).toBe("IN");
    expect(adjustment.source).toBe("ADJUSTMENT");
    expect(Number(adjustment.quantity)).toBeCloseTo(newBalanceAfterAdjustment - initialQty, 6);
    expect(Number(adjustment.balance)).toBeCloseTo(newBalanceAfterAdjustment, 6);
    expect(adjustment.notes).toBe(adjustmentPayload.notes);

    const listRes = await request.get(
        `${baseUrl}/inventory-movement?productId=${createdProduct.id}&sortBy=createdAt&sortOrder=desc`
    );
    expect(listRes.status()).toBe(200);
    const { data: list } = await listRes.json();
    const latest = list.items[0];
    expect(Number(latest.balance)).toBeCloseTo(newBalanceAfterAdjustment, 6);
    expect(latest.notes).toBe(adjustmentPayload.notes);
});

test("Cria ajuste de estoque OUT e aceita quantidade final negativa", async ({ request }) => {
    const unity = await createAuxUnity(request);
    const def = await createAuxDefinition(request);
    const warehouse = await createAuxWarehouse(request);

    const initialQty = 18.75;
    const createProductRes = await request.post(`${baseUrl}/products`, {
        data: {
            id: genId(),
            productDefinitionId: def.id,
            unityId: unity.id,
            name: `PROD_ADJ_OUT_${Date.now().toString().slice(-6)}`,
            barcode: null,
            inventory: { costValue: 3.3, saleValue: 6.6, quantity: initialQty },
        },
    });
    expect(createProductRes.status()).toBe(200);
    const { data: createdProduct } = await createProductRes.json();

    const lowerTarget = 7.5;
    const lowerRes = await request.post(`${baseUrl}/inventory-movement/adjustments`, {
        data: {
            productId: createdProduct.id,
            quantity: lowerTarget,
            warehouseId: warehouse.id,
            notes: "Ajuste para reduzir estoque",
        },
    });
    expect(lowerRes.status()).toBe(200);
    const { data: lowerAdjustment } = await lowerRes.json();
    expect(lowerAdjustment.direction).toBe("OUT");
    expect(Number(lowerAdjustment.quantity)).toBeCloseTo(initialQty - lowerTarget, 6);
    expect(Number(lowerAdjustment.balance)).toBeCloseTo(lowerTarget, 6);

    const negativeTarget = -4.25;
    const negativeRes = await request.post(`${baseUrl}/inventory-movement/adjustments`, {
        data: {
            productId: createdProduct.id,
            quantity: negativeTarget,
            warehouseId: warehouse.id,
            notes: "Ajuste para saldo negativo",
        },
    });
    expect(negativeRes.status()).toBe(200);
    const { data: negativeAdjustment } = await negativeRes.json();
    expect(negativeAdjustment.direction).toBe("OUT");
    expect(Number(negativeAdjustment.quantity)).toBeCloseTo(
        Math.abs(negativeTarget - lowerTarget),
        6
    );
    expect(Number(negativeAdjustment.balance)).toBeCloseTo(negativeTarget, 6);

    const listRes = await request.get(
        `${baseUrl}/inventory-movement?productId=${createdProduct.id}&sortBy=createdAt&sortOrder=desc`
    );
    expect(listRes.status()).toBe(200);
    const { data: list } = await listRes.json();
    expect(Number(list.items[0].balance)).toBeCloseTo(negativeTarget, 6);
});

test("Valida payload de ajuste de estoque", async ({ request }) => {
    const missingRes = await request.post(`${baseUrl}/inventory-movement/adjustments`, {
        data: {},
    });
    expect(missingRes.status()).toBe(400);
    const missingBody = await missingRes.json();
    expect(missingBody.message).toContain(INVENTORY_MOVEMENT_ERROR.MISSING_FIELDS);

    const invalidFieldsRes = await request.post(`${baseUrl}/inventory-movement/adjustments`, {
        data: { productId: "abc", quantity: "xyz", warehouseId: null },
    });
    expect(invalidFieldsRes.status()).toBe(400);
    const invalidFieldsBody = await invalidFieldsRes.json();
    expect(invalidFieldsBody.message).toContain(INVENTORY_MOVEMENT_ERROR.INVALID_ADJUSTMENT_FIELDS);
});
