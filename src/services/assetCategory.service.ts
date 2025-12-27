import { prisma } from "@config/prisma";
import { BaseService } from "@services/base.service";
import { AppError } from "@utils/appError";
import { assetCategoryAllowedSortFields } from "@routes/assetCategory.routes";

export interface AssetCategoryInput {
    id?: number;
    name: string;
    description?: string | null;
}

export class AssetCategoryService extends BaseService {
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
                                  { name: { contains: search } },
                                  { description: { contains: search } },
                              ],
                          }
                        : {}),
                };

                const validSortFields = assetCategoryAllowedSortFields;
                const safeSortBy = validSortFields.includes(sortBy) ? sortBy : "createdAt";
                const safeSortOrder = sortOrder === "asc" ? "asc" : "desc";

                const [categories, total] = await prisma.$transaction([
                    prisma.assetCategory.findMany({
                        where,
                        skip,
                        take: limit,
                        orderBy: { [safeSortBy]: safeSortOrder },
                    }),
                    prisma.assetCategory.count({ where }),
                ]);

                return {
                    items: categories,
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
                            ...(process.env.ENVIRONMENT !== "PRODUCTION" &&
                            typeof data.id === "number"
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
