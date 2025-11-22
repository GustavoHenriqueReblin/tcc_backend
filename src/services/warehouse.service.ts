import { prisma } from "@config/prisma";
import { env } from "@config/env";
import { BaseService } from "@services/base.service";
import { AppError } from "@utils/appError";

export interface WarehouseInput {
    id?: number;
    code: string;
    name: string;
    description?: string | null;
}

export class WarehouseService extends BaseService {
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
                                  { code: { contains: search } },
                                  { name: { contains: search } },
                                  { description: { contains: search } },
                              ],
                          }
                        : {}),
                };

                const validSortFields = ["code", "name", "description", "createdAt", "updatedAt"];
                const safeSortBy = validSortFields.includes(sortBy) ? sortBy : "createdAt";
                const safeSortOrder = sortOrder === "asc" ? "asc" : "desc";

                const [warehouses, total] = await prisma.$transaction([
                    prisma.warehouse.findMany({
                        where,
                        skip,
                        take: limit,
                        orderBy: { [safeSortBy]: safeSortOrder },
                    }),
                    prisma.warehouse.count({ where }),
                ]);

                return {
                    warehouses,
                    meta: {
                        total,
                        page,
                        totalPages: Math.ceil(total / limit),
                    },
                };
            },
            "WAREHOUSE:getAll",
            enterpriseId
        );

    getById = async (id: number, enterpriseId: number) =>
        this.safeQuery(
            async () => {
                const wh = await prisma.warehouse.findUnique({ where: { id, enterpriseId } });
                if (!wh) throw new AppError("Depósito não encontrado", 404, "WAREHOUSE:getById");
                return wh;
            },
            "WAREHOUSE:getById",
            enterpriseId
        );

    create = async (enterpriseId: number, data: WarehouseInput, userId: number) =>
        this.safeQuery(
            async () => {
                const exists = await prisma.warehouse.findFirst({
                    where: { enterpriseId, code: data.code },
                });
                if (exists) throw new AppError("Depósito já cadastrado", 409, "WAREHOUSE:create");

                const created = await prisma.$transaction(async (tx) => {
                    const wh = await tx.warehouse.create({
                        data: {
                            ...(env.ENVIRONMENT !== "PRODUCTION" && typeof data.id === "number"
                                ? { id: data.id }
                                : {}),
                            enterpriseId,
                            code: data.code,
                            name: data.name,
                            description: data.description ?? null,
                        },
                    });

                    await tx.audit.create({
                        data: {
                            userId,
                            enterpriseId,
                            action: `Created warehouse ${wh.code} - ${wh.name}`,
                            entity: "Warehouse",
                        },
                    });

                    return wh;
                });

                return created;
            },
            "WAREHOUSE:create",
            enterpriseId
        );

    update = async (id: number, enterpriseId: number, data: WarehouseInput, userId: number) =>
        this.safeQuery(
            async () => {
                const existing = await prisma.warehouse.findFirst({ where: { id, enterpriseId } });
                if (!existing)
                    throw new AppError("Depósito não encontrado", 404, "WAREHOUSE:update");

                if (data.code && data.code !== existing.code) {
                    const codeTaken = await prisma.warehouse.findFirst({
                        where: { enterpriseId, code: data.code, NOT: { id } },
                    });
                    if (codeTaken)
                        throw new AppError("Depósito já cadastrado", 409, "WAREHOUSE:update");
                }

                const updated = await prisma.$transaction(async (tx) => {
                    const wh = await tx.warehouse.update({
                        where: { id },
                        data: {
                            code: data.code,
                            name: data.name,
                            description: data.description ?? null,
                        },
                    });

                    await tx.audit.create({
                        data: {
                            userId,
                            enterpriseId,
                            action: `Updated warehouse ${wh.code} - ${wh.name}`,
                            entity: "Warehouse",
                        },
                    });

                    return wh;
                });

                return updated;
            },
            "WAREHOUSE:update",
            enterpriseId
        );
}
