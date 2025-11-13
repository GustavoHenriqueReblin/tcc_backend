import { test, expect, APIRequestContext } from "@playwright/test";
import { env } from "../src/config/env";
import { ProductDefinitionType } from "@prisma/client";
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

    let mvRes = await request.get(`${baseUrl}/inventoryMovement?productId=${productId}`);
    expect(mvRes.status()).toBe(200);
    let { data: mvData } = await mvRes.json();
    expect(Array.isArray(mvData.movements)).toBeTruthy();
    expect(mvData.movements.length).toBeGreaterThan(0);
    let last = mvData.movements[0];
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

    mvRes = await request.get(`${baseUrl}/inventoryMovement?productId=${productId}`);
    expect(mvRes.status()).toBe(200);
    ({ data: mvData } = await mvRes.json());
    last = mvData.movements[0];
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

    mvRes = await request.get(`${baseUrl}/inventoryMovement?productId=${productId}`);
    expect(mvRes.status()).toBe(200);
    ({ data: mvData } = await mvRes.json());
    last = mvData.movements[0];
    expect(last.direction).toBe("OUT");
    expect(Number(last.quantity)).toBeCloseTo(higherQty - lowerQty, 6);
    expect(Number(last.balance)).toBeCloseTo(lowerQty, 6);
});
