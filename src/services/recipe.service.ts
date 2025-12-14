import { prisma } from "@config/prisma";
import { env } from "@config/env";
import { BaseService } from "@services/base.service";
import { AppError } from "@utils/appError";
import { recipeAllowedSortFields } from "@routes/recipe.routes";
import { Decimal } from "@prisma/client/runtime/library";
import type { Prisma } from "@prisma/client";
import { NestedItemsPayload, normalizeNestedItemsPayload } from "@utils/nestedItems";

export interface RecipeInput {
    id?: number;
    productId: number;
    description?: string | null;
    notes?: string | null;
    items?: RecipeItemsPayload;
}

export interface RecipeItemCreateData {
    id?: number;
    productId: number;
    quantity: number;
}

export interface RecipeItemUpdateData {
    id: number;
    productId?: number;
    quantity?: number;
}

export type RecipeItemsPayload = NestedItemsPayload<RecipeItemCreateData, RecipeItemUpdateData>;

export interface RecipeCreateData {
    id?: number;
    description?: string | null;
    notes?: string | null;
    items?: RecipeItemsPayload;
}

export interface RecipeUpdateData {
    id: number;
    description?: string | null;
    notes?: string | null;
    items?: RecipeItemsPayload;
}

export type RecipesPayload = NestedItemsPayload<RecipeCreateData, RecipeUpdateData>;

export class RecipeService extends BaseService {
    getAll = async (
        enterpriseId: number,
        page = 1,
        limit = 10,
        search?: string | null,
        sortBy?: string,
        sortOrder?: "asc" | "desc"
    ) =>
        this.safeQuery(
            async () => {
                search = search?.trim() || null;
                sortBy = sortBy || "createdAt";
                sortOrder = sortOrder || "desc";

                const skip = (page - 1) * limit;

                const where = {
                    enterpriseId,
                    ...(search
                        ? {
                              OR: [
                                  { description: { contains: search } },
                                  { notes: { contains: search } },
                                  { product: { name: { contains: search } } },
                                  { product: { barcode: { contains: search } } },
                              ],
                          }
                        : {}),
                };

                const validSortFields = recipeAllowedSortFields;
                const safeSortBy = validSortFields.includes(sortBy) ? sortBy : "createdAt";
                const safeSortOrder = sortOrder === "asc" ? "asc" : "desc";

                const [recipes, total] = await prisma.$transaction([
                    prisma.recipe.findMany({
                        where,
                        include: {
                            product: { include: { unity: true } },
                            items: {
                                include: {
                                    product: {
                                        include: { unity: true },
                                    },
                                },
                            },
                        },
                        skip,
                        take: limit,
                        orderBy: { [safeSortBy]: safeSortOrder },
                    }),
                    prisma.recipe.count({ where }),
                ]);

                return {
                    items: recipes,
                    meta: {
                        total,
                        page,
                        totalPages: Math.ceil(total / limit),
                    },
                };
            },
            "RECIPE:getAll",
            enterpriseId
        );

    getById = async (id: number, enterpriseId: number) =>
        this.safeQuery(
            async () =>
                prisma.recipe.findUnique({
                    where: { id, enterpriseId },
                    include: {
                        product: { include: { unity: true } },
                        items: { include: { product: { include: { unity: true } } } },
                    },
                }),
            "RECIPE:getById",
            enterpriseId
        );

    create = async (enterpriseId: number, data: RecipeInput, userId: number) =>
        this.safeQuery(
            async () => {
                const product = await prisma.product.findFirst({
                    where: { id: data.productId, enterpriseId },
                    select: { id: true },
                });
                if (!product) throw new AppError("Produto não encontrado", 404, "FK:NOT_FOUND");

                const created = await prisma.$transaction(async (tx) => {
                    const recipe = await tx.recipe.create({
                        data: {
                            ...(env.ENVIRONMENT !== "PRODUCTION" && typeof data.id === "number"
                                ? { id: data.id }
                                : {}),
                            enterpriseId,
                            productId: data.productId,
                            description: data.description ?? null,
                            notes: data.notes ?? null,
                        },
                    });

                    await this.syncRecipeItems(tx, enterpriseId, recipe.id, data.items);

                    await tx.audit.create({
                        data: {
                            userId,
                            enterpriseId,
                            action: `Created recipe for product ${data.productId}`,
                            entity: "Recipe",
                        },
                    });

                    return recipe;
                });

                return created;
            },
            "RECIPE:create",
            enterpriseId
        );

    update = async (id: number, enterpriseId: number, data: RecipeInput, userId: number) =>
        this.safeQuery(
            async () => {
                const existing = await prisma.recipe.findFirst({ where: { id, enterpriseId } });
                if (!existing) throw new AppError("Receita não encontrada", 404, "RECIPE:update");

                if (data.productId) {
                    const product = await prisma.product.findFirst({
                        where: { id: data.productId, enterpriseId },
                        select: { id: true },
                    });
                    if (!product) throw new AppError("Produto não encontrado", 404, "FK:NOT_FOUND");
                }

                const updated = await prisma.$transaction(async (tx) => {
                    const recipe = await tx.recipe.update({
                        where: { id },
                        data: {
                            productId: data.productId ?? existing.productId,
                            description: data.description ?? existing.description,
                            notes: data.notes ?? existing.notes,
                            updatedAt: new Date(),
                        },
                    });

                    await this.syncRecipeItems(tx, enterpriseId, recipe.id, data.items);

                    await tx.audit.create({
                        data: {
                            userId,
                            enterpriseId,
                            action: `Updated recipe ${recipe.id}`,
                            entity: "Recipe",
                        },
                    });

                    return recipe;
                });

                return updated;
            },
            "RECIPE:update",
            enterpriseId
        );

    syncRecipes = async (
        tx: Prisma.TransactionClient,
        enterpriseId: number,
        productId: number,
        payload?: RecipesPayload
    ) => {
        if (!payload) return;

        const { create, update, delete: remove } = normalizeNestedItemsPayload(payload);
        if (!create.length && !update.length && !remove.length) return;

        const product = await tx.product.findFirst({
            where: { id: productId, enterpriseId },
            select: { id: true },
        });
        if (!product) {
            throw new AppError("Produto não encontrado", 404, "RECIPE:nested:product:FK");
        }

        const targetIds = Array.from(new Set([...update.map((r) => r.id), ...remove]));
        if (targetIds.length) {
            const found = await tx.recipe.findMany({
                where: { enterpriseId, productId, id: { in: targetIds } },
                select: { id: true },
            });

            if (found.length !== targetIds.length) {
                throw new AppError(
                    "Receita não encontrada",
                    404,
                    "RECIPE:nested:recipes:NOT_FOUND"
                );
            }
        }

        if (remove.length) {
            await tx.recipeItem.deleteMany({
                where: {
                    enterpriseId,
                    recipeId: { in: remove },
                },
            });

            await tx.recipe.deleteMany({
                where: {
                    enterpriseId,
                    productId,
                    id: { in: remove },
                },
            });
        }
        for (const recipeData of update) {
            await tx.recipe.update({
                where: { id: recipeData.id },
                data: {
                    ...(recipeData.description !== undefined
                        ? { description: recipeData.description }
                        : {}),
                    ...(recipeData.notes !== undefined ? { notes: recipeData.notes } : {}),
                    updatedAt: new Date(),
                },
            });

            if (recipeData.items) {
                await this.syncRecipeItems(tx, enterpriseId, recipeData.id, recipeData.items);
            }
        }

        for (const recipeData of create) {
            const recipe = await tx.recipe.create({
                data: {
                    ...(env.ENVIRONMENT !== "PRODUCTION" && typeof recipeData.id === "number"
                        ? { id: recipeData.id }
                        : {}),
                    enterpriseId,
                    productId,
                    description: recipeData.description ?? null,
                    notes: recipeData.notes ?? null,
                },
            });

            if (recipeData.items) {
                await this.syncRecipeItems(tx, enterpriseId, recipe.id, recipeData.items);
            }
        }
    };

    private async syncRecipeItems(
        tx: Prisma.TransactionClient,
        enterpriseId: number,
        recipeId: number,
        payload?: RecipeItemsPayload
    ) {
        if (!payload) return;

        const { create, update, delete: remove } = normalizeNestedItemsPayload(payload);
        if (!create.length && !update.length && !remove.length) return;

        const productIds = Array.from(
            new Set([
                ...create.map((item) => item.productId),
                ...update
                    .map((item) => item.productId)
                    .filter((id): id is number => typeof id === "number"),
            ])
        );

        if (productIds.length) {
            const products = await tx.product.findMany({
                where: { enterpriseId, id: { in: productIds } },
                select: { id: true },
            });
            if (products.length !== productIds.length) {
                throw new AppError("Produto não encontrado", 404, "RECIPE:items:FK");
            }
        }

        const targetIds = Array.from(new Set([...update.map((item) => item.id), ...remove]));
        if (targetIds.length) {
            const found = await tx.recipeItem.findMany({
                where: { enterpriseId, recipeId, id: { in: targetIds } },
                select: { id: true },
            });
            if (found.length !== targetIds.length) {
                throw new AppError("Item da receita não encontrado", 404, "RECIPE:items:NOT_FOUND");
            }
        }

        if (remove.length) {
            await tx.recipeItem.deleteMany({
                where: { enterpriseId, recipeId, id: { in: remove } },
            });
        }

        for (const item of update) {
            await tx.recipeItem.update({
                where: { id: item.id },
                data: {
                    productId: typeof item.productId === "number" ? item.productId : undefined,
                    quantity: item.quantity !== undefined ? new Decimal(item.quantity) : undefined,
                },
            });
        }

        for (const item of create) {
            await tx.recipeItem.create({
                data: {
                    ...(env.ENVIRONMENT !== "PRODUCTION" && typeof item.id === "number"
                        ? { id: item.id }
                        : {}),
                    enterpriseId,
                    recipeId,
                    productId: item.productId,
                    quantity: new Decimal(item.quantity),
                },
            });
        }
    }
}
