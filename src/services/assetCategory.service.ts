import { prisma } from "@config/prisma";
import { env } from "@config/env";
import { BaseService } from "@services/base.service";
import { AppError } from "@utils/appError";

export interface AssetCategoryInput {
    id?: number;
    name: string;
    description?: string | null;
}

export class AssetCategoryService extends BaseService {
    getAll = async (enterpriseId: number, page = 1, limit = 10) =>
        this.safeQuery(
            async () => {
                const skip = (page - 1) * limit;

                const [categories, total] = await prisma.$transaction([
                    prisma.assetCategory.findMany({
                        where: { enterpriseId },
                        skip,
                        take: limit,
                        orderBy: { createdAt: "desc" },
                    }),
                    prisma.assetCategory.count({ where: { enterpriseId } }),
                ]);

                return {
                    assetCategories: categories,
                    meta: {
                        total,
                        page,
                        totalPages: Math.ceil(total / limit),
                    },
                };
            },
            "ASSET_CATEGORY:getAll",
            enterpriseId
        );

    getById = async (id: number, enterpriseId: number) =>
        this.safeQuery(
            async () => {
                const category = await prisma.assetCategory.findUnique({
                    where: { id, enterpriseId },
                });

                if (!category) {
                    throw new AppError(
                        "Categoria de ativo não encontrada",
                        404,
                        "ASSET_CATEGORY:getById"
                    );
                }

                return category;
            },
            "ASSET_CATEGORY:getById",
            enterpriseId
        );

    create = async (enterpriseId: number, data: AssetCategoryInput, userId: number) =>
        this.safeQuery(
            async () => {
                const exists = await prisma.assetCategory.findFirst({
                    where: { enterpriseId, name: data.name },
                });

                if (exists) {
                    throw new AppError(
                        "Categoria de ativo já cadastrada",
                        409,
                        "ASSET_CATEGORY:create"
                    );
                }

                const created = await prisma.$transaction(async (tx) => {
                    const category = await tx.assetCategory.create({
                        data: {
                            ...(env.ENVIRONMENT !== "PRODUCTION" && typeof data.id === "number"
                                ? { id: data.id }
                                : {}),
                            enterpriseId,
                            name: data.name,
                            description: data.description ?? null,
                        },
                    });

                    await tx.audit.create({
                        data: {
                            userId,
                            enterpriseId,
                            action: `Created asset category ${category.name}`,
                            entity: "AssetCategory",
                        },
                    });

                    return category;
                });

                return created;
            },
            "ASSET_CATEGORY:create",
            enterpriseId
        );

    update = async (id: number, enterpriseId: number, data: AssetCategoryInput, userId: number) =>
        this.safeQuery(
            async () => {
                const existing = await prisma.assetCategory.findFirst({
                    where: { id, enterpriseId },
                });

                if (!existing) {
                    throw new AppError(
                        "Categoria de ativo não encontrada",
                        404,
                        "ASSET_CATEGORY:update"
                    );
                }

                if (data.name && data.name !== existing.name) {
                    const nameTaken = await prisma.assetCategory.findFirst({
                        where: { enterpriseId, name: data.name, NOT: { id } },
                    });

                    if (nameTaken) {
                        throw new AppError(
                            "Categoria de ativo já cadastrada",
                            409,
                            "ASSET_CATEGORY:update"
                        );
                    }
                }

                const updated = await prisma.$transaction(async (tx) => {
                    const category = await tx.assetCategory.update({
                        where: { id },
                        data: {
                            name: data.name,
                            description: data.description,
                        },
                    });

                    await tx.audit.create({
                        data: {
                            userId,
                            enterpriseId,
                            action: `Updated asset category ${category.name}`,
                            entity: "AssetCategory",
                        },
                    });

                    return category;
                });

                return updated;
            },
            "ASSET_CATEGORY:update",
            enterpriseId
        );
}
