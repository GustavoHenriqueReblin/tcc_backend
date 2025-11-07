import { prisma } from "@config/prisma";
import { env } from "@config/env";
import { BaseService } from "@services/base.service";
import { AppError } from "@utils/appError";

export interface UnityInput {
    id?: number;
    simbol: string;
    description?: string | null;
}

export class UnityService extends BaseService {
    getAll = async (enterpriseId: number, page = 1, limit = 10) =>
        this.safeQuery(
            async () => {
                const skip = (page - 1) * limit;

                const [unities, total] = await prisma.$transaction([
                    prisma.unity.findMany({
                        where: { enterpriseId },
                        skip,
                        take: limit,
                        orderBy: { createdAt: "desc" },
                    }),
                    prisma.unity.count({ where: { enterpriseId } }),
                ]);

                return {
                    unities,
                    meta: {
                        total,
                        page,
                        totalPages: Math.ceil(total / limit),
                    },
                };
            },
            "UNITY:getAll",
            enterpriseId
        );

    getById = async (id: number, enterpriseId: number) =>
        this.safeQuery(
            async () => {
                return prisma.unity.findUnique({ where: { id, enterpriseId } });
            },
            "UNITY:getById",
            enterpriseId
        );

    create = async (enterpriseId: number, data: UnityInput, userId: number) =>
        this.safeQuery(
            async () => {
                const exists = await prisma.unity.findFirst({
                    where: { enterpriseId, simbol: data.simbol },
                });
                if (exists) throw new AppError("Unidade já cadastrada", 409, "UNITY:create");

                const created = await prisma.$transaction(async (tx) => {
                    const unity = await tx.unity.create({
                        data: {
                            ...(env.ENVIRONMENT !== "PRODUCTION" && typeof data.id === "number"
                                ? { id: data.id }
                                : {}),
                            enterpriseId,
                            simbol: data.simbol,
                            description: data.description ?? null,
                        },
                    });

                    await tx.audit.create({
                        data: {
                            userId,
                            enterpriseId,
                            action: `Created unity ${unity.simbol}`,
                            entity: "Unity",
                        },
                    });

                    return unity;
                });

                return created;
            },
            "UNITY:create",
            enterpriseId
        );

    update = async (id: number, enterpriseId: number, data: UnityInput, userId: number) =>
        this.safeQuery(
            async () => {
                const existing = await prisma.unity.findFirst({ where: { id, enterpriseId } });
                if (!existing) throw new AppError("Unidade não encontrada", 404, "UNITY:update");

                if (data.simbol && data.simbol !== existing.simbol) {
                    const simbolTaken = await prisma.unity.findFirst({
                        where: { enterpriseId, simbol: data.simbol, NOT: { id } },
                    });
                    if (simbolTaken)
                        throw new AppError("Unidade já cadastrada", 409, "UNITY:update");
                }

                const updated = await prisma.$transaction(async (tx) => {
                    const unity = await tx.unity.update({
                        where: { id },
                        data: { ...data, updatedAt: new Date() },
                    });

                    await tx.audit.create({
                        data: {
                            userId,
                            enterpriseId,
                            action: `Updated unity ${unity.simbol}`,
                            entity: "Unity",
                        },
                    });

                    return unity;
                });

                return updated;
            },
            "UNITY:update",
            enterpriseId
        );
}
