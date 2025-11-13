import { prisma } from "@config/prisma";
import { env } from "@config/env";
import { BaseService } from "@services/base.service";
import { AppError } from "@utils/appError";

export interface LotInput {
    id?: number;
    code: string;
    productId?: number | null;
    harvestDate?: Date | string | null;
    expiration?: Date | string | null;
    notes?: string | null;
}

export class LotService extends BaseService {
    getAll = async (enterpriseId: number, page = 1, limit = 10) =>
        this.safeQuery(
            async () => {
                const skip = (page - 1) * limit;

                const [lots, total] = await prisma.$transaction([
                    prisma.lot.findMany({
                        where: { enterpriseId },
                        include: { product: true },
                        skip,
                        take: limit,
                        orderBy: { createdAt: "desc" },
                    }),
                    prisma.lot.count({ where: { enterpriseId } }),
                ]);

                return {
                    lots,
                    meta: {
                        total,
                        page,
                        totalPages: Math.ceil(total / limit),
                    },
                };
            },
            "LOT:getAll",
            enterpriseId
        );

    getById = async (id: number, enterpriseId: number) =>
        this.safeQuery(
            async () =>
                prisma.lot.findUnique({
                    where: { id, enterpriseId },
                    include: { product: true, movements: true },
                }),
            "LOT:getById",
            enterpriseId
        );

    create = async (enterpriseId: number, data: LotInput, userId: number) =>
        this.safeQuery(
            async () => {
                const [existingCode, product] = await Promise.all([
                    prisma.lot.findFirst({ where: { code: data.code } }),
                    prisma.product.findFirst({
                        where: { id: data.productId ?? 0, enterpriseId },
                        select: { id: true },
                    }),
                ]);

                if (existingCode)
                    throw new AppError("Lote já existe", 409, "LOT:create");
                if (data.productId && !product)
                    throw new AppError("Produto não encontrado", 404, "FK:NOT_FOUND");

                const created = await prisma.$transaction(async (tx) => {
                    const lot = await tx.lot.create({
                        data: {
                            ...(env.ENVIRONMENT !== "PRODUCTION" && typeof data.id === "number"
                                ? { id: data.id }
                                : {}),
                            enterpriseId,
                            code: data.code,
                            productId: data.productId ?? null,
                            harvestDate: data.harvestDate
                                ? new Date(data.harvestDate)
                                : null,
                            expiration: data.expiration ? new Date(data.expiration) : null,
                            notes: data.notes ?? null,
                        },
                    });

                    await tx.audit.create({
                        data: {
                            userId,
                            enterpriseId,
                            action: `Created lot ${lot.code}`,
                            entity: "Lot",
                        },
                    });

                    return lot;
                });

                return created;
            },
            "LOT:create",
            enterpriseId
        );

    update = async (id: number, enterpriseId: number, data: LotInput, userId: number) =>
        this.safeQuery(
            async () => {
                const existing = await prisma.lot.findFirst({ where: { id, enterpriseId } });
                if (!existing) throw new AppError("Lote não encontrado", 404, "LOT:update");

                if (data.code && data.code !== existing.code) {
                    const codeTaken = await prisma.lot.findFirst({ where: { code: data.code } });
                    if (codeTaken)
                        throw new AppError("Lote já existe", 409, "LOT:update:code");
                }

                if (data.productId) {
                    const product = await prisma.product.findFirst({
                        where: { id: data.productId, enterpriseId },
                        select: { id: true },
                    });
                    if (!product) throw new AppError("Produto não encontrado", 404, "FK:NOT_FOUND");
                }

                const updated = await prisma.$transaction(async (tx) => {
                    const lot = await tx.lot.update({
                        where: { id },
                        data: {
                            code: data.code ?? existing.code,
                            productId: data.productId ?? null,
                            harvestDate: data.harvestDate
                                ? new Date(data.harvestDate)
                                : existing.harvestDate,
                            expiration: data.expiration
                                ? new Date(data.expiration)
                                : existing.expiration,
                            notes: data.notes ?? existing.notes,
                            updatedAt: new Date(),
                        },
                    });

                    await tx.audit.create({
                        data: {
                            userId,
                            enterpriseId,
                            action: `Updated lot ${lot.code}`,
                            entity: "Lot",
                        },
                    });

                    return lot;
                });

                return updated;
            },
            "LOT:update",
            enterpriseId
        );
}

