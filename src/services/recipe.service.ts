import { prisma } from "@config/prisma";
import { env } from "@config/env";
import { BaseService } from "@services/base.service";
import { AppError } from "@utils/appError";

export interface RecipeInput {
    id?: number;
    productId: number;
    description?: string | null;
    notes?: string | null;
}

export class RecipeService extends BaseService {
    getAll = async (enterpriseId: number, page = 1, limit = 10) =>
        this.safeQuery(
            async () => {
                const skip = (page - 1) * limit;

                const [recipes, total] = await prisma.$transaction([
                    prisma.recipe.findMany({
                        where: { enterpriseId },
                        include: { product: true, items: true },
                        skip,
                        take: limit,
                        orderBy: { createdAt: "desc" },
                    }),
                    prisma.recipe.count({ where: { enterpriseId } }),
                ]);

                return {
                    recipes,
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
                    include: { product: true, items: true },
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
}

