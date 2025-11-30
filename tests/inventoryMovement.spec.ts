import { test, expect, APIRequestContext } from "@playwright/test";
import { env } from "../src/config/env";
import { ProductDefinitionType } from "@prisma/client";
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

test("Movimentos IN/OUT atualizam balance corretamente", async ({ request }) => {
    // Arrange - cria dependências e produto inicial
    const unity = await createAuxUnity(request);
    const def = await createAuxDefinition(request);

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

    // Create product -> gera movimento IN com balance = initialQty
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

    // Update product com quantidade maior -> movimento IN com delta positivo e balance atualizado
    const higherQty = 25.75;
    const upd1 = await request.put(`${baseUrl}/products/${productId}`, {
        data: {
            productDefinitionId: def.id,
            unityId: unity.id,
            name: `${nameBase}_UP1`,
            barcode: "7890001112223",
            inventory: {
                costValue: 6.66,
                saleValue: 12.34,
                quantity: higherQty,
            },
        },
    });
    expect(upd1.status()).toBe(200);

    mvRes = await request.get(`${baseUrl}/inventory-movement?productId=${productId}`);
    expect(mvRes.status()).toBe(200);
    ({ data: mvData } = await mvRes.json());
    last = mvData.items[0];
    expect(last.direction).toBe("IN");
    expect(Number(last.quantity)).toBeCloseTo(higherQty - initialQty, 6);
    expect(Number(last.balance)).toBeCloseTo(higherQty, 6);

    // Update product com quantidade menor -> movimento OUT com delta positivo e balance atualizado
    const lowerQty = 7.25;
    const upd2 = await request.put(`${baseUrl}/products/${productId}`, {
        data: {
            productDefinitionId: def.id,
            unityId: unity.id,
            name: `${nameBase}_UP2`,
            barcode: "7890001112223",
            inventory: {
                costValue: 6.66, // não deve alterar custo em OUT
                saleValue: 12.34,
                quantity: lowerQty,
            },
        },
    });
    expect(upd2.status()).toBe(200);

    mvRes = await request.get(`${baseUrl}/inventory-movement?productId=${productId}`);
    expect(mvRes.status()).toBe(200);
    ({ data: mvData } = await mvRes.json());
    last = mvData.items[0];
    expect(last.direction).toBe("OUT");
    expect(Number(last.quantity)).toBeCloseTo(higherQty - lowerQty, 6);
    expect(Number(last.balance)).toBeCloseTo(lowerQty, 6);
});

test("Validação, busca e ordenação de inventory-movement", async ({ request }) => {
    const resMissingProduct = await request.get(`${baseUrl}/inventory-movement`);
    expect(resMissingProduct.status()).toBe(400);
    const bodyMissingProduct = await resMissingProduct.json();
    expect(bodyMissingProduct.message).toContain(INVENTORY_MOVEMENT_ERROR.MISSING_PRODUCT);

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
});

test("Cria ajuste de estoque IN e atualiza balance", async ({ request }) => {
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

    const adjustmentPayload = {
        productId: createdProduct.id,
        quantity: 30,
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
    expect(Number(adjustment.quantity)).toBeCloseTo(adjustmentPayload.quantity, 6);
    expect(Number(adjustment.balance)).toBeCloseTo(adjustmentPayload.quantity + initialQty, 6);
    expect(adjustment.notes).toBe(adjustmentPayload.notes);

    const listRes = await request.get(
        `${baseUrl}/inventory-movement?productId=${createdProduct.id}&sortBy=createdAt&sortOrder=desc`
    );
    expect(listRes.status()).toBe(200);
    const { data: list } = await listRes.json();
    const latest = list.items[0];
    expect(Number(latest.balance)).toBeCloseTo(adjustmentPayload.quantity + initialQty, 6);
    expect(latest.notes).toBe(adjustmentPayload.notes);
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

    const invalidQtyRes = await request.post(`${baseUrl}/inventory-movement/adjustments`, {
        data: { productId: 1, quantity: 0, warehouseId: 1 },
    });
    expect(invalidQtyRes.status()).toBe(400);
    const invalidQtyBody = await invalidQtyRes.json();
    expect(invalidQtyBody.message).toContain(INVENTORY_MOVEMENT_ERROR.INVALID_ADJUSTMENT_QUANTITY);
});
