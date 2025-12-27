import { test, expect, APIRequestContext } from "@playwright/test";
import { env } from "../src/config/env";
import { ProductDefinitionType } from "@prisma/client";
import { PRODUCT_ERROR } from "../src/middleware/product.middleware";
import { genId } from "./utils/idGenerator";

const baseUrl = `http://localhost:${env.PORT}/api/v1`;

const createAuxUnity = async (request: APIRequestContext) => {
    const simbol = `U${Date.now().toString().slice(-6)}`;
    const res = await request.post(`${baseUrl}/unities`, {
        data: { id: genId(), simbol, description: "Aux" },
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
    type = ProductDefinitionType.FINISHED_PRODUCT
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

const createAuxProduct = async (request: APIRequestContext, prefix = "PROD_REC") => {
    const unity = await createAuxUnity(request);
    const def = await createAuxDefinition(request);
    const nameBase = `${prefix}_${Date.now().toString().slice(-6)}`;
    const res = await request.post(`${baseUrl}/products`, {
        data: {
            id: genId(),
            productDefinitionId: def.id,
            unityId: unity.id,
            name: nameBase,
            barcode: null,
            inventory: {
                costValue: 5.1234,
                saleValue: 9.8765,
                quantity: 2.5,
            },
        },
    });
    expect(res.status()).toBe(200);
    const { data } = await res.json();
    return data;
};

test("Lista produtos com paginação básica", async ({ request }) => {
    const res = await request.get(`${baseUrl}/products`);
    expect(res.status()).toBe(200);
    const { data } = await res.json();

    expect(Array.isArray(data.items)).toBeTruthy();
    expect(typeof data.meta.total).toBe("number");
    expect(data.meta.page).toBe(1);
    expect(data.items.length).toBeLessThanOrEqual(10);
});

test("Validação de id, paginação e ordenação de products", async ({ request }) => {
    const resInvalidId = await request.get(`${baseUrl}/products/not-a-number`);
    expect(resInvalidId.status()).toBe(400);
    const bodyInvalidId = await resInvalidId.json();
    expect(bodyInvalidId.message).toContain(PRODUCT_ERROR.ID);

    const resInvalidPagination = await request.get(`${baseUrl}/products?page=abc&limit=xyz`);
    expect(resInvalidPagination.status()).toBe(400);
    const bodyInvalidPagination = await resInvalidPagination.json();
    expect(bodyInvalidPagination.message).toContain(PRODUCT_ERROR.PAGINATION);

    const resInvalidSortOrder = await request.get(`${baseUrl}/products?sortOrder=ascending`);
    expect(resInvalidSortOrder.status()).toBe(400);
    const bodyInvalidSortOrder = await resInvalidSortOrder.json();
    expect(bodyInvalidSortOrder.message).toContain(PRODUCT_ERROR.SORT);

    const resInvalidDefinition = await request.get(
        `${baseUrl}/products?productDefinitionId=not-a-number`
    );
    expect(resInvalidDefinition.status()).toBe(400);
    const bodyInvalidDefinition = await resInvalidDefinition.json();
    expect(bodyInvalidDefinition.message).toContain(PRODUCT_ERROR.PRODUCT_DEFINITION_ID);

    const resInvalidSortBy = await request.get(`${baseUrl}/products?sortBy=unknown`);
    expect(resInvalidSortBy.status()).toBe(400);
    const bodyInvalidSortBy = await resInvalidSortBy.json();
    expect(bodyInvalidSortBy.message).toContain(PRODUCT_ERROR.SORT_BY);
});

test("Cria produto (com inventory), busca e atualiza", async ({ request }) => {
    // Cria dependências auxiliares
    const unity = await createAuxUnity(request);
    const def = await createAuxDefinition(request);

    const nameBase = `PROD_${Date.now().toString().slice(-6)}`;
    const payload = {
        id: genId(),
        productDefinitionId: def.id,
        unityId: unity.id,
        name: nameBase,
        barcode: null,
        inventory: {
            costValue: 12.3456,
            saleValue: 23.4567,
            quantity: 100.1234,
        },
    };

    // Create
    const createRes = await request.post(`${baseUrl}/products`, { data: payload });
    expect(createRes.status()).toBe(200);
    const { data: created } = await createRes.json();
    expect(created).toBeTruthy();
    expect(created.name).toBe(nameBase);
    expect(created.productInventory?.length ?? 0).toBeGreaterThan(0);
    expect(Number(created.productInventory[0].quantity)).toBeCloseTo(payload.inventory.quantity, 5);

    // Get by id
    const getRes = await request.get(`${baseUrl}/products/${created.id}`);
    expect(getRes.status()).toBe(200);
    const { data: fetched } = await getRes.json();
    expect(fetched).toBeTruthy();
    expect(fetched.id).toBe(created.id);
    expect(fetched.unity?.id).toBe(unity.id);
    expect(fetched.productDefinition?.id).toBe(def.id);

    // Update product and inventory
    const updateRes = await request.put(`${baseUrl}/products/${created.id}`, {
        data: {
            productDefinitionId: def.id,
            unityId: unity.id,
            name: `${nameBase}_UPD`,
            barcode: "7890001112223",
            inventory: {
                costValue: 9.99,
                saleValue: 19.99,
                quantity: 88.8888,
            },
        },
    });
    expect(updateRes.status()).toBe(200);
    const { data: updated } = await updateRes.json();
    expect(updated.name).toBe(`${nameBase}_UPD`);
    expect(updated.barcode).toBe("7890001112223");
    expect(Number(updated.productInventory[0].costValue)).toBeCloseTo(9.99, 2);
    expect(Number(updated.productInventory[0].saleValue)).toBeCloseTo(19.99, 2);
    expect(Number(updated.productInventory[0].quantity)).toBeCloseTo(88.8888, 4);
});

test("Cria produto com recipes e itens associados", async ({ request }) => {
    const unity = await createAuxUnity(request);
    const def = await createAuxDefinition(request);
    const componentA = await createAuxProduct(request, "PROD_REC_A");
    const componentB = await createAuxProduct(request, "PROD_REC_B");
    const nameBase = `PROD_RECIPES_${Date.now().toString().slice(-6)}`;

    const createRes = await request.post(`${baseUrl}/products`, {
        data: {
            id: genId(),
            productDefinitionId: def.id,
            unityId: unity.id,
            name: nameBase,
            barcode: null,
            inventory: {
                costValue: 15.4321,
                saleValue: 25.6789,
                quantity: 12.5,
            },
            recipes: {
                create: [
                    {
                        description: "Receita principal",
                        notes: "Criada junto com o produto",
                        items: {
                            create: [
                                { productId: componentA.id, quantity: 1.5 },
                                { productId: componentB.id, quantity: 2.25 },
                            ],
                            update: [],
                            delete: [],
                        },
                    },
                ],
                update: [],
                delete: [],
            },
        },
    });
    expect(createRes.status()).toBe(200);
    const { data: created } = await createRes.json();

    expect(Array.isArray(created.recipe)).toBeTruthy();
    expect(created.recipe.length).toBeGreaterThanOrEqual(1);

    const storedRecipe = created.recipe.find(
        (recipe: { description?: string | null }) => recipe.description === "Receita principal"
    );
    expect(storedRecipe).toBeTruthy();

    const itemFromComponentA = storedRecipe!.items.find(
        (item: { productId: number }) => item.productId === componentA.id
    );
    const itemFromComponentB = storedRecipe!.items.find(
        (item: { productId: number }) => item.productId === componentB.id
    );

    expect(itemFromComponentA).toBeTruthy();
    expect(itemFromComponentB).toBeTruthy();
    expect(Number(itemFromComponentA!.quantity)).toBeCloseTo(1.5, 4);
    expect(Number(itemFromComponentB!.quantity)).toBeCloseTo(2.25, 4);

    const getRes = await request.get(`${baseUrl}/products/${created.id}`);
    expect(getRes.status()).toBe(200);
    const { data: fetched } = await getRes.json();

    const fetchedRecipe = fetched.recipe.find(
        (recipe: { description?: string | null }) => recipe.description === "Receita principal"
    );
    expect(fetchedRecipe).toBeTruthy();
    expect(fetchedRecipe!.items.length).toBeGreaterThanOrEqual(2);
});

test("Atualiza produto sincronizando recipes existentes", async ({ request }) => {
    const unity = await createAuxUnity(request);
    const def = await createAuxDefinition(request);
    const componentA = await createAuxProduct(request, "PROD_SYNC_A");
    const componentB = await createAuxProduct(request, "PROD_SYNC_B");
    const componentC = await createAuxProduct(request, "PROD_SYNC_C");
    const nameBase = `PROD_SYNC_${Date.now().toString().slice(-6)}`;

    const initialRes = await request.post(`${baseUrl}/products`, {
        data: {
            id: genId(),
            productDefinitionId: def.id,
            unityId: unity.id,
            name: nameBase,
            barcode: null,
            inventory: {
                costValue: 9.321,
                saleValue: 19.876,
                quantity: 22.44,
            },
            recipes: {
                create: [
                    {
                        description: "Receita principal",
                        notes: "Base",
                        items: {
                            create: [
                                { productId: componentA.id, quantity: 1 },
                                { productId: componentB.id, quantity: 2 },
                            ],
                            update: [],
                            delete: [],
                        },
                    },
                    {
                        description: "Receita temporaria",
                        notes: null,
                        items: {
                            create: [{ productId: componentB.id, quantity: 3 }],
                            update: [],
                            delete: [],
                        },
                    },
                ],
                update: [],
                delete: [],
            },
        },
    });
    expect(initialRes.status()).toBe(200);
    const { data: created } = await initialRes.json();

    const mainRecipe = created.recipe.find(
        (recipe: { description?: string | null }) => recipe.description === "Receita principal"
    );
    const tempRecipe = created.recipe.find(
        (recipe: { description?: string | null }) => recipe.description === "Receita temporaria"
    );

    expect(mainRecipe).toBeTruthy();
    expect(tempRecipe).toBeTruthy();

    const mainItemA = mainRecipe!.items.find(
        (item: { productId: number }) => item.productId === componentA.id
    );
    const mainItemB = mainRecipe!.items.find(
        (item: { productId: number }) => item.productId === componentB.id
    );

    expect(mainItemA).toBeTruthy();
    expect(mainItemB).toBeTruthy();

    const updateRes = await request.put(`${baseUrl}/products/${created.id}`, {
        data: {
            productDefinitionId: def.id,
            unityId: unity.id,
            name: `${nameBase}_UPD`,
            barcode: `BR${Date.now().toString().slice(-6)}`,
            inventory: {
                costValue: 4.44,
                saleValue: 8.88,
                quantity: 15.5,
            },
            recipes: {
                create: [
                    {
                        description: "Receita nova",
                        notes: "Ingrediente adicional",
                        items: {
                            create: [{ productId: componentC.id, quantity: 4.75 }],
                            update: [],
                            delete: [],
                        },
                    },
                ],
                update: [
                    {
                        id: mainRecipe!.id,
                        description: "Receita principal ajustada",
                        items: {
                            create: [],
                            update: [{ id: mainItemA!.id, quantity: 5.5555 }],
                            delete: [mainItemB!.id],
                        },
                    },
                ],
                delete: [tempRecipe!.id],
            },
        },
    });
    expect(updateRes.status()).toBe(200);
    const { data: updated } = await updateRes.json();

    const updatedMain = updated.recipe.find(
        (recipe: { id: number }) => recipe.id === mainRecipe!.id
    );
    expect(updatedMain).toBeTruthy();
    expect(updatedMain!.description).toBe("Receita principal ajustada");

    const updatedItemA = updatedMain!.items.find(
        (item: { id: number }) => item.id === mainItemA!.id
    );
    expect(updatedItemA).toBeTruthy();
    expect(Number(updatedItemA!.quantity)).toBeCloseTo(5.5555, 4);

    const removedItem = updatedMain!.items.find(
        (item: { id: number }) => item.id === mainItemB!.id
    );
    expect(removedItem).toBeUndefined();

    expect(
        updated.recipe.some((recipe: { id: number }) => recipe.id === tempRecipe!.id)
    ).toBeFalsy();

    const newRecipe = updated.recipe.find(
        (recipe: { description?: string | null }) => recipe.description === "Receita nova"
    );
    expect(newRecipe).toBeTruthy();
    const newRecipeItem = newRecipe!.items.find(
        (item: { productId: number }) => item.productId === componentC.id
    );
    expect(newRecipeItem).toBeTruthy();
    expect(Number(newRecipeItem!.quantity)).toBeCloseTo(4.75, 4);
});

test("Busca e ordenação de products", async ({ request }) => {
    const nameBase = `PROD_SRCH_${Date.now().toString().slice(-6)}`;
    const unity = await createAuxUnity(request);
    const def = await createAuxDefinition(request);

    const createRes = await request.post(`${baseUrl}/products`, {
        data: {
            id: genId(),
            productDefinitionId: def.id,
            unityId: unity.id,
            name: `${nameBase}_A`,
            barcode: `123${Date.now().toString().slice(-6)}`,
            inventory: { costValue: 1.1, saleValue: 2.2, quantity: 3.3 },
        },
    });
    expect(createRes.status()).toBe(200);

    const resSearch = await request.get(
        `${baseUrl}/products?search=${encodeURIComponent(nameBase.slice(0, 5))}&sortBy=name&sortOrder=asc`
    );
    expect(resSearch.status()).toBe(200);
    const { data: searchData } = await resSearch.json();

    expect(searchData.items.length).toBeGreaterThan(0);
    expect(
        searchData.items.every(
            (p: { name: string; barcode?: string | null }) =>
                p.name.toLowerCase().includes(nameBase.slice(0, 5).toLowerCase()) ||
                p.barcode?.toLowerCase().includes(nameBase.slice(0, 5).toLowerCase())
        )
    ).toBeTruthy();

    const names = searchData.items.map((p: { name: string }) => p.name.toLowerCase());
    const sortedNames = [...names].sort();
    expect(names).toEqual(sortedNames);
});

test("Filtra products por productDefinitionId", async ({ request }) => {
    const unity = await createAuxUnity(request);
    const finishedDef = await createAuxDefinition(request, ProductDefinitionType.FINISHED_PRODUCT);
    const rawDef = await createAuxDefinition(request, ProductDefinitionType.RAW_MATERIAL);

    const rawName = `PROD_RAW_${Date.now().toString().slice(-6)}`;
    const rawRes = await request.post(`${baseUrl}/products`, {
        data: {
            id: genId(),
            productDefinitionId: rawDef.id,
            unityId: unity.id,
            name: rawName,
            barcode: null,
            inventory: { costValue: 7.7, saleValue: 8.8, quantity: 9.9 },
        },
    });
    expect(rawRes.status()).toBe(200);
    const { data: rawProduct } = await rawRes.json();

    const finishedRes = await request.post(`${baseUrl}/products`, {
        data: {
            id: genId(),
            productDefinitionId: finishedDef.id,
            unityId: unity.id,
            name: `${rawName}_FIN`,
            barcode: null,
            inventory: { costValue: 1.1, saleValue: 2.2, quantity: 3.3 },
        },
    });
    expect(finishedRes.status()).toBe(200);

    const filteredRes = await request.get(
        `${baseUrl}/products?productDefinitionId=${rawDef.id}&sortBy=createdAt`
    );
    expect(filteredRes.status()).toBe(200);
    const { data: filtered } = await filteredRes.json();

    expect(filtered.items.length).toBeGreaterThan(0);
    expect(
        filtered.items.every(
            (p: { productDefinitionId?: number | null }) => p.productDefinitionId === rawDef.id
        )
    ).toBeTruthy();
    expect(filtered.items.some((p: { id: number }) => p.id === rawProduct.id)).toBeTruthy();
});

test("Criar produto com recipes sem estrutura válida retorna 400", async ({ request }) => {
    const unity = await createAuxUnity(request);
    const def = await createAuxDefinition(request);
    const res = await request.post(`${baseUrl}/products`, {
        data: {
            id: genId(),
            productDefinitionId: def.id,
            unityId: unity.id,
            name: `PROD_REC_INVALID_${Date.now().toString().slice(-6)}`,
            barcode: null,
            inventory: { costValue: 2.5, saleValue: 4.5, quantity: 1.25 },
            recipes: {
                create: [],
                update: [],
            },
        },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.message).toContain("recipes deve conter as propriedades create, update e delete");
});

// test("Criar produto com recipes.items inválido retorna 400", async ({ request }) => {
//     const unity = await createAuxUnity(request);
//     const def = await createAuxDefinition(request);

//     const res = await request.post(`${baseUrl}/products`, {
//         data: {
//             id: genId(),
//             productDefinitionId: def.id,
//             unityId: unity.id,
//             name: `PROD_REC_ITEMS_${Date.now().toString().slice(-6)}`,
//             barcode: null,
//             inventory: { costValue: 3.33, saleValue: 6.66, quantity: 9.99 },
//             recipes: {
//                 create: [
//                     {
//                         description: "Receita incompleta",
//                         notes: null,
//                         items: [],
//                     },
//                 ],
//                 update: [],
//                 delete: [],
//             },
//         },
//     });
//     expect(res.status()).toBe(400);
//     const body = await res.json();
//     expect(body.message).toContain(
//         "recipes.create_0.items deve conter as propriedades create, update e delete"
//     );
// });

test("Buscar produto inexistente retorna data = null", async ({ request }) => {
    const res = await request.get(`${baseUrl}/products/-9999999`);
    expect(res.status()).toBe(404);
    const body = await res.json();
    expect(body.error).toBeTruthy();
});

test("Atualizar produto inexistente retorna 404", async ({ request }) => {
    const res = await request.put(`${baseUrl}/products/9999999`, {
        data: {
            name: "Inexistente",
            inventory: { costValue: 1, saleValue: 2, quantity: 3 },
        },
    });
    expect(res.status()).toBe(404);
    const body = await res.json();
    expect(body.error).toBeTruthy();
});
