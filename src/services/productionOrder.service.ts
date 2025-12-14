import { prisma } from "@config/prisma";
import { env } from "@config/env";
import { BaseService } from "@services/base.service";
import { AppError } from "@utils/appError";
import { Decimal } from "@prisma/client/runtime/library";
import { ProductionOrderStatus } from "@prisma/client";
import { productionOrderAllowedSortFields } from "@routes/productionOrder.routes";

export interface ProductionOrderInputData {
    id?: number;
    code: string;
    recipeId: number;
    lotId?: number | null;
    status?: ProductionOrderStatus;
    plannedQty: number;
    producedQty?: number | null;
    wasteQty?: number | null;
    startDate?: Date | string | null;
    endDate?: Date | string | null;
    notes?: string | null;
}

export class ProductionOrderService extends BaseService {
    getAll = async (
        enterpriseId: number,
        page = 1,
        limit = 10,
        status?: ProductionOrderStatus,
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
                    ...(status && { status }),

                    ...(search
                        ? {
                              OR: [
                                  {
                                      code: {
                                          contains: search,
                                      },
                                  },
                                  {
                                      recipe: {
                                          product: {
                                              OR: [
                                                  { name: { contains: search } },
                                                  { barcode: { contains: search } },
                                              ],
                                          },
                                      },
                                  },
                              ],
                          }
                        : {}),
                };

                const validSortFields = productionOrderAllowedSortFields;
                const safeSortBy = validSortFields.includes(sortBy) ? sortBy : "createdAt";
                const safeSortOrder = sortOrder === "asc" ? "asc" : "desc";

                const [orders, total] = await prisma.$transaction([
                    prisma.productionOrder.findMany({
                        where,
                        include: {
                            recipe: { include: { product: { include: { unity: true } } } },
                            lot: true,
                            inputs: true,
                        },
                        skip,
                        take: limit,
                        orderBy: { [safeSortBy]: safeSortOrder },
                    }),
                    prisma.productionOrder.count({
                        where,
                    }),
                ]);

                return {
                    items: orders,
                    meta: {
                        total,
                        page,
                        totalPages: Math.ceil(total / limit),
                    },
                };
            },
            "PRODUCTION_ORDER:getAll",
            enterpriseId
        );

    getById = async (id: number, enterpriseId: number) =>
        this.safeQuery(
            async () =>
                prisma.productionOrder.findUnique({
                    where: { id, enterpriseId },
                    include: { recipe: { include: { product: true } }, lot: true, inputs: true },
                }),
            "PRODUCTION_ORDER:getById",
            enterpriseId
        );

    create = async (enterpriseId: number, data: ProductionOrderInputData, userId: number) =>
        this.safeQuery(
            async () => {
                const [codeTaken, recipe, lot] = await Promise.all([
                    prisma.productionOrder.findFirst({ where: { code: data.code } }),
                    prisma.recipe.findFirst({
                        where: { id: data.recipeId, enterpriseId },
                        select: { id: true, productId: true },
                    }),
                    data.lotId
                        ? prisma.lot.findFirst({
                              where: { id: data.lotId, enterpriseId },
                              select: { id: true },
                          })
                        : Promise.resolve(null),
                ]);

                if (codeTaken)
                    throw new AppError("Ordem já existe", 409, "PRODUCTION_ORDER:create");
                if (!recipe) throw new AppError("Receita não encontrada", 404, "FK:NOT_FOUND");
                if (data.lotId && !lot)
                    throw new AppError("Lote não encontrado", 404, "FK:NOT_FOUND");

                const created = await prisma.$transaction(async (tx) => {
                    const order = await tx.productionOrder.create({
                        data: {
                            ...(env.ENVIRONMENT !== "PRODUCTION" && typeof data.id === "number"
                                ? { id: data.id }
                                : {}),
                            enterpriseId,
                            code: data.code,
                            recipeId: data.recipeId,
                            productId: recipe.productId,
                            lotId: data.lotId ?? null,
                            status: data.status ?? ProductionOrderStatus.PLANNED,
                            plannedQty: new Decimal(data.plannedQty),
                            producedQty:
                                data.producedQty !== undefined && data.producedQty !== null
                                    ? new Decimal(data.producedQty)
                                    : null,
                            wasteQty:
                                data.wasteQty !== undefined && data.wasteQty !== null
                                    ? new Decimal(data.wasteQty)
                                    : null,
                            startDate: data.startDate ? new Date(data.startDate) : null,
                            endDate: data.endDate ? new Date(data.endDate) : null,
                            notes: data.notes ?? null,
                        },
                    });

                    await tx.audit.create({
                        data: {
                            userId,
                            enterpriseId,
                            action: `Created production order ${order.code}`,
                            entity: "ProductionOrder",
                        },
                    });

                    return order;
                });

                return created;
            },
            "PRODUCTION_ORDER:create",
            enterpriseId
        );

    update = async (
        id: number,
        enterpriseId: number,
        data: ProductionOrderInputData,
        userId: number
    ) =>
        this.safeQuery(
            async () => {
                const existing = await prisma.productionOrder.findFirst({
                    where: { id, enterpriseId },
                });
                if (!existing)
                    throw new AppError(
                        "Ordem de produção não encontrada",
                        404,
                        "PRODUCTION_ORDER:update"
                    );

                if (data.code && data.code !== existing.code) {
                    const codeTaken = await prisma.productionOrder.findFirst({
                        where: { code: data.code },
                    });
                    if (codeTaken)
                        throw new AppError("Ordem já existe", 409, "PRODUCTION_ORDER:update:code");
                }

                let recipeProductId: number | null | undefined;
                if (data.recipeId) {
                    const recipe = await prisma.recipe.findFirst({
                        where: { id: data.recipeId, enterpriseId },
                        select: { id: true, productId: true },
                    });
                    if (!recipe) throw new AppError("Receita não encontrada", 404, "FK:NOT_FOUND");
                    recipeProductId = recipe.productId;
                }

                if (data.lotId) {
                    const lot = await prisma.lot.findFirst({
                        where: { id: data.lotId, enterpriseId },
                        select: { id: true },
                    });
                    if (!lot) throw new AppError("Lote não encontrado", 404, "FK:NOT_FOUND");
                }

                const updated = await prisma.$transaction(async (tx) => {
                    const order = await tx.productionOrder.update({
                        where: { id },
                        data: {
                            code: data.code ?? existing.code,
                            recipeId: data.recipeId ?? existing.recipeId,
                            productId: recipeProductId ?? existing.productId,
                            lotId: data.lotId ?? existing.lotId,
                            status: data.status ?? existing.status,
                            plannedQty:
                                data.plannedQty !== undefined
                                    ? new Decimal(data.plannedQty)
                                    : existing.plannedQty,
                            producedQty:
                                data.producedQty !== undefined && data.producedQty !== null
                                    ? new Decimal(data.producedQty)
                                    : existing.producedQty,
                            wasteQty:
                                data.wasteQty !== undefined && data.wasteQty !== null
                                    ? new Decimal(data.wasteQty)
                                    : existing.wasteQty,
                            startDate: data.startDate
                                ? new Date(data.startDate)
                                : existing.startDate,
                            endDate: data.endDate ? new Date(data.endDate) : existing.endDate,
                            notes: data.notes ?? existing.notes,
                            updatedAt: new Date(),
                        },
                    });

                    await tx.audit.create({
                        data: {
                            userId,
                            enterpriseId,
                            action: `Updated production order ${order.code}`,
                            entity: "ProductionOrder",
                        },
                    });

                    return order;
                });

                return updated;
            },
            "PRODUCTION_ORDER:update",
            enterpriseId
        );
}
