import { prisma } from "@config/prisma";
import { BaseService } from "@services/base.service";
import { AppError } from "@utils/appError";
import { AssetStatus } from "@prisma/client";
import { assetAllowedSortFields } from "@routes/asset.routes";

export interface AssetInput {
    id?: number;
    categoryId: number;
    name: string;
    acquisitionDate: Date | string;
    acquisitionCost: number;
    usefulLifeMonths: number;
    salvageValue: number;
    location?: string | null;
    status?: AssetStatus;
    notes?: string | null;
}

export class AssetService extends BaseService {
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
                                  { location: { contains: search } },
                                  { category: { name: { contains: search } } },
                              ],
                          }
                        : {}),
                };

                const validSortFields = assetAllowedSortFields;
                const safeSortBy = validSortFields.includes(sortBy) ? sortBy : "createdAt";
                const safeSortOrder = sortOrder === "asc" ? "asc" : "desc";

                const [assets, total] = await prisma.$transaction([
                    prisma.asset.findMany({
                        where,
                        include: { category: true },
                        skip,
                        take: limit,
                        orderBy: { [safeSortBy]: safeSortOrder },
                    }),
                    prisma.asset.count({ where }),
                ]);

                return {
                    items: assets,
                    meta: {
                        total,
                        page,
                        totalPages: Math.ceil(total / limit),
                    },
                };
            },
            "ASSET:getAll",
            enterpriseId
        );

    getById = async (id: number, enterpriseId: number) =>
        this.safeQuery(
            async () => {
                const asset = await prisma.asset.findUnique({
                    where: { id, enterpriseId },
                    include: { category: true, maintenance: true },
                });

                if (!asset) {
                    throw new AppError("Ativo não encontrado", 404, "ASSET:getById");
                }

                return asset;
            },
            "ASSET:getById",
            enterpriseId
        );

    create = async (enterpriseId: number, data: AssetInput, userId: number) =>
        this.safeQuery(
            async () => {
                const category = await prisma.assetCategory.findFirst({
                    where: { id: data.categoryId, enterpriseId },
                    select: { id: true },
                });

                if (!category) {
                    throw new AppError("Categoria de ativo não encontrada", 404, "FK:NOT_FOUND");
                }

                const created = await prisma.$transaction(async (tx) => {
                    const asset = await tx.asset.create({
                        data: {
                            ...(process.env.ENVIRONMENT !== "PRODUCTION" &&
                            typeof data.id === "number"
                                ? { id: data.id }
                                : {}),
                            enterpriseId,
                            categoryId: data.categoryId,
                            name: data.name,
                            acquisitionDate: new Date(data.acquisitionDate),
                            acquisitionCost: data.acquisitionCost,
                            usefulLifeMonths: data.usefulLifeMonths,
                            salvageValue: data.salvageValue,
                            location: data.location ?? null,
                            status: data.status ?? AssetStatus.ACTIVE,
                            notes: data.notes ?? null,
                        },
                    });

                    await tx.audit.create({
                        data: {
                            userId,
                            enterpriseId,
                            action: `Created asset ${asset.name}`,
                            entity: "Asset",
                        },
                    });

                    return asset;
                });

                return created;
            },
            "ASSET:create",
            enterpriseId
        );

    update = async (id: number, enterpriseId: number, data: AssetInput, userId: number) =>
        this.safeQuery(
            async () => {
                const existing = await prisma.asset.findFirst({
                    where: { id, enterpriseId },
                });

                if (!existing) {
                    throw new AppError("Ativo não encontrado", 404, "ASSET:update");
                }

                if (data.categoryId && data.categoryId !== existing.categoryId) {
                    const category = await prisma.assetCategory.findFirst({
                        where: { id: data.categoryId, enterpriseId },
                        select: { id: true },
                    });

                    if (!category) {
                        throw new AppError(
                            "Categoria de ativo não encontrada",
                            404,
                            "FK:NOT_FOUND"
                        );
                    }
                }

                const updated = await prisma.$transaction(async (tx) => {
                    const asset = await tx.asset.update({
                        where: { id },
                        data: {
                            categoryId: data.categoryId ?? existing.categoryId,
                            name: data.name ?? existing.name,
                            acquisitionDate: data.acquisitionDate
                                ? new Date(data.acquisitionDate)
                                : existing.acquisitionDate,
                            acquisitionCost: data.acquisitionCost ?? existing.acquisitionCost,
                            usefulLifeMonths: data.usefulLifeMonths ?? existing.usefulLifeMonths,
                            salvageValue: data.salvageValue ?? existing.salvageValue,
                            location: data.location ?? existing.location,
                            status: data.status ?? existing.status,
                            notes: data.notes ?? existing.notes,
                            updatedAt: new Date(),
                        },
                    });

                    await tx.audit.create({
                        data: {
                            userId,
                            enterpriseId,
                            action: `Updated asset ${asset.name}`,
                            entity: "Asset",
                        },
                    });

                    return asset;
                });

                return updated;
            },
            "ASSET:update",
            enterpriseId
        );
}
