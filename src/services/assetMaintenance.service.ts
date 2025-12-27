import { prisma } from "@config/prisma";
import { BaseService } from "@services/base.service";
import { AppError } from "@utils/appError";
import { AssetMaintenanceType } from "@prisma/client";
import { assetMaintenanceAllowedSortFields } from "@routes/assetMaintenance.routes";

export interface AssetMaintenanceInput {
    id?: number;
    assetId: number;
    type?: AssetMaintenanceType;
    description?: string | null;
    cost?: number | null;
    date: Date | string;
    technician?: string | null;
    notes?: string | null;
}

export class AssetMaintenanceService extends BaseService {
    getAll = async (
        enterpriseId: number,
        page = 1,
        limit = 10,
        assetId?: number,
        search?: string | null,
        sortBy?: string,
        sortOrder?: "asc" | "desc"
    ) =>
        this.safeQuery(
            async () => {
                search = search?.trim() || null;
                sortBy = sortBy || "date";
                sortOrder = sortOrder || "desc";

                const skip = (page - 1) * limit;

                const where = {
                    enterpriseId,
                    ...(typeof assetId === "number" ? { assetId } : {}),
                    ...(search
                        ? {
                              OR: [
                                  { description: { contains: search } },
                                  { technician: { contains: search } },
                                  { asset: { name: { contains: search } } },
                              ],
                          }
                        : {}),
                };

                const validSortFields = assetMaintenanceAllowedSortFields;
                const safeSortBy = validSortFields.includes(sortBy) ? sortBy : "date";
                const safeSortOrder = sortOrder === "asc" ? "asc" : "desc";

                const [maintenances, total] = await prisma.$transaction([
                    prisma.assetMaintenance.findMany({
                        where,
                        include: { asset: { include: { category: true } } },
                        skip,
                        take: limit,
                        orderBy: { [safeSortBy]: safeSortOrder },
                    }),
                    prisma.assetMaintenance.count({ where }),
                ]);

                return {
                    items: maintenances,
                    meta: {
                        total,
                        page,
                        totalPages: Math.ceil(total / limit),
                    },
                };
            },
            "ASSET_MAINTENANCE:getAll",
            enterpriseId
        );

    getById = async (id: number, enterpriseId: number) =>
        this.safeQuery(
            async () => {
                const maintenance = await prisma.assetMaintenance.findUnique({
                    where: { id, enterpriseId },
                    include: { asset: { include: { category: true } } },
                });

                if (!maintenance) {
                    throw new AppError(
                        "Manutenção de ativo não encontrada",
                        404,
                        "ASSET_MAINTENANCE:getById"
                    );
                }

                return maintenance;
            },
            "ASSET_MAINTENANCE:getById",
            enterpriseId
        );

    create = async (enterpriseId: number, data: AssetMaintenanceInput, userId: number) =>
        this.safeQuery(
            async () => {
                const asset = await prisma.asset.findFirst({
                    where: { id: data.assetId, enterpriseId },
                    select: { id: true, name: true },
                });

                if (!asset) {
                    throw new AppError("Ativo não encontrado", 404, "FK:NOT_FOUND");
                }

                const created = await prisma.$transaction(async (tx) => {
                    const maintenance = await tx.assetMaintenance.create({
                        data: {
                            ...(process.env.ENVIRONMENT !== "PRODUCTION" &&
                            typeof data.id === "number"
                                ? { id: data.id }
                                : {}),
                            enterpriseId,
                            assetId: data.assetId,
                            type: data.type ?? AssetMaintenanceType.OTHER,
                            description: data.description ?? null,
                            cost: data.cost ?? null,
                            date: new Date(data.date),
                            technician: data.technician ?? null,
                            notes: data.notes ?? null,
                        },
                    });

                    await tx.audit.create({
                        data: {
                            userId,
                            enterpriseId,
                            action: `Created asset maintenance for asset ${asset.name}`,
                            entity: "AssetMaintenance",
                        },
                    });

                    return maintenance;
                });

                return created;
            },
            "ASSET_MAINTENANCE:create",
            enterpriseId
        );

    update = async (
        id: number,
        enterpriseId: number,
        data: AssetMaintenanceInput,
        userId: number
    ) =>
        this.safeQuery(
            async () => {
                const existing = await prisma.assetMaintenance.findFirst({
                    where: { id, enterpriseId },
                    include: { asset: true },
                });

                if (!existing) {
                    throw new AppError(
                        "Manutenção de ativo não encontrada",
                        404,
                        "ASSET_MAINTENANCE:update"
                    );
                }

                if (data.assetId && data.assetId !== existing.assetId) {
                    const asset = await prisma.asset.findFirst({
                        where: { id: data.assetId, enterpriseId },
                        select: { id: true },
                    });

                    if (!asset) {
                        throw new AppError("Ativo não encontrado", 404, "FK:NOT_FOUND");
                    }
                }

                const updated = await prisma.$transaction(async (tx) => {
                    const maintenance = await tx.assetMaintenance.update({
                        where: { id },
                        data: {
                            assetId: data.assetId ?? existing.assetId,
                            type: data.type ?? existing.type,
                            description: data.description ?? existing.description,
                            cost: data.cost ?? existing.cost,
                            date: data.date ? new Date(data.date) : existing.date,
                            technician: data.technician ?? existing.technician,
                            notes: data.notes ?? existing.notes,
                            updatedAt: new Date(),
                        },
                    });

                    const asset = await tx.asset.findFirst({
                        where: { id: maintenance.assetId, enterpriseId },
                        select: { name: true },
                    });

                    await tx.audit.create({
                        data: {
                            userId,
                            enterpriseId,
                            action: `Updated asset maintenance for asset ${
                                asset?.name ?? maintenance.assetId
                            }`,
                            entity: "AssetMaintenance",
                        },
                    });

                    return maintenance;
                });

                return updated;
            },
            "ASSET_MAINTENANCE:update",
            enterpriseId
        );
}
