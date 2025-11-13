import { prisma } from "@config/prisma";
import { env } from "@config/env";
import { BaseService } from "@services/base.service";
import { AppError } from "@utils/appError";
import { Decimal } from "@prisma/client/runtime/library";

export interface RecipeItemInput {
    id?: number;
    recipeId: number;
    productId: number;
    quantity: number;
}

export class RecipeItemService extends BaseService {
    getAll = async (
        enterpriseId: number,
        page = 1,
        limit = 10,
        recipeId?: number
    ) =>
        this.safeQuery(
            async () => {
                const skip = (page - 1) * limit;

                const [items, total] = await prisma.$transaction([
                    prisma.recipeItem.findMany({
                        where: { enterpriseId, ...(recipeId && { recipeId }) },
                        include: { recipe: true, product: true },
                        skip,
                        take: limit,
                        orderBy: { id: "desc" },
                    }),
                    prisma.recipeItem.count({ where: { enterpriseId, ...(recipeId && { recipeId }) } }),
                ]);

                return {
                    items,
                    meta: {
                        total,
                        page,
                        totalPages: Math.ceil(total / limit),
                    },
                };
            },
            "RECIPE_ITEM:getAll",
            enterpriseId
        );

    getById = async (id: number, enterpriseId: number) =>
        this.safeQuery(
            async () =>
                prisma.recipeItem.findUnique({
                    where: { id, enterpriseId },
                    include: { recipe: true, product: true },
                }),
            "RECIPE_ITEM:getById",
            enterpriseId
        );

    create = async (enterpriseId: number, data: RecipeItemInput, userId: number) =>
        this.safeQuery(
            async () => {
                const [recipe, product] = await Promise.all([
                    prisma.recipe.findFirst({
                        where: { id: data.recipeId, enterpriseId },
                        select: { id: true },
                    }),
                    prisma.product.findFirst({
                        where: { id: data.productId, enterpriseId },
                        select: { id: true },
                    }),
                ]);

                if (!recipe) throw new AppError("Receita não encontrada", 404, "FK:NOT_FOUND");
                if (!product) throw new AppError("Produto não encontrado", 404, "FK:NOT_FOUND");

                const created = await prisma.$transaction(async (tx) => {
                    const item = await tx.recipeItem.create({
                        data: {
                            ...(env.ENVIRONMENT !== "PRODUCTION" && typeof data.id === "number"
                                ? { id: data.id }
                                : {}),
                            enterpriseId,
                            recipeId: data.recipeId,
                            productId: data.productId,
                            quantity: new Decimal(data.quantity),
                        },
                    });

                    await tx.audit.create({
                        data: {
                            userId,
                            enterpriseId,
                            action: `Added item ${data.productId} to recipe ${data.recipeId}`,
                            entity: "RecipeItem",
                        },
                    });

                    return item;
                });

                return created;
            },
            "RECIPE_ITEM:create",
            enterpriseId
        );

    update = async (
        id: number,
        enterpriseId: number,
        data: RecipeItemInput,
        userId: number
    ) =>
        this.safeQuery(
            async () => {
                const existing = await prisma.recipeItem.findFirst({ where: { id, enterpriseId } });
                if (!existing)
                    throw new AppError("Item da receita não encontrado", 404, "RECIPE_ITEM:update");

                if (data.recipeId) {
                    const recipe = await prisma.recipe.findFirst({
                        where: { id: data.recipeId, enterpriseId },
                        select: { id: true },
                    });
                    if (!recipe) throw new AppError("Receita não encontrada", 404, "FK:NOT_FOUND");
                }

                if (data.productId) {
                    const product = await prisma.product.findFirst({
                        where: { id: data.productId, enterpriseId },
                        select: { id: true },
                    });
                    if (!product) throw new AppError("Produto não encontrado", 404, "FK:NOT_FOUND");
                }

                const updated = await prisma.$transaction(async (tx) => {
                    const item = await tx.recipeItem.update({
                        where: { id },
                        data: {
                            recipeId: data.recipeId ?? existing.recipeId,
                            productId: data.productId ?? existing.productId,
                            quantity:
                                data.quantity !== undefined
                                    ? new Decimal(data.quantity)
                                    : existing.quantity,
                        },
                    });

                    await tx.audit.create({
                        data: {
                            userId,
                            enterpriseId,
                            action: `Updated recipe item ${id}`,
                            entity: "RecipeItem",
                        },
                    });

                    return item;
                });

                return updated;
            },
            "RECIPE_ITEM:update",
            enterpriseId
        );
}

