import { prisma } from "@config/prisma";
import { env } from "@config/env";
import { BaseService } from "@services/base.service";
import { AppError } from "@utils/appError";
import { Decimal } from "@prisma/client/runtime/library";
import { Prisma, ProductionOrderStatus } from "@prisma/client";
import { productionOrderAllowedSortFields } from "@routes/productionOrder.routes";
import { NestedItemsPayload, normalizeNestedItemsPayload } from "@utils/nestedItems";

export interface ProductionOrderPayload {
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

    inputs?: ProductionOrderInputsPayload;
}

export interface ProductionOrderInputFormData {
    id?: number;
    productId: number;
    quantity: number;
    unitCost?: number | null;
}

export interface ProductionOrderInputUpdateData {
    id: number;
    productId?: number;
    quantity?: number;
    unitCost?: number | null;
}

export type ProductionOrderInputsPayload = NestedItemsPayload<
    ProductionOrderInputFormData,
    ProductionOrderInputUpdateData
>;

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

    create = async (enterpriseId: number, data: ProductionOrderPayload, userId: number) =>
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

                    if (data.inputs) {
                        await this.syncProductionOrderInputs(
                            tx,
                            enterpriseId,
                            order.id,
                            data.inputs
                        );
                    }

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
        data: ProductionOrderPayload,
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

                    if (data.inputs) {
                        await this.syncProductionOrderInputs(
                            tx,
                            enterpriseId,
                            order.id,
                            data.inputs
                        );
                    }

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

    private async syncProductionOrderInputs(
        tx: Prisma.TransactionClient,
        enterpriseId: number,
        productionOrderId: number,
        payload?: ProductionOrderInputsPayload
    ) {
        if (!payload) return;

        const { create, update, delete: remove } = normalizeNestedItemsPayload(payload);

        if (!create.length && !update.length && !remove.length) return;

        /**
         * 1. Validar produtos (FK)
         */
        const productIds = Array.from(
            new Set([
                ...create.map((item) => item.productId),
                ...update
                    .map((item) => item.productId)
                    .filter((id): id is number => typeof id === "number"),
            ])
        );

        if (productIds.length) {
            const products = await tx.product.findMany({
                where: {
                    enterpriseId,
                    id: { in: productIds },
                },
                select: { id: true },
            });

            if (products.length !== productIds.length) {
                throw new AppError(
                    "Matéria-prima não encontrada",
                    404,
                    "PRODUCTION_ORDER:inputs:FK"
                );
            }
        }

        /**
         * 2. Validar se os inputs pertencem à OP
         */
        const targetIds = Array.from(new Set([...update.map((item) => item.id), ...remove]));

        if (targetIds.length) {
            const found = await tx.productionOrderInput.findMany({
                where: {
                    enterpriseId,
                    productionOrderId,
                    id: { in: targetIds },
                },
                select: { id: true },
            });

            if (found.length !== targetIds.length) {
                throw new AppError(
                    "Insumo da ordem de produção não encontrado",
                    404,
                    "PRODUCTION_ORDER:inputs:NOT_FOUND"
                );
            }
        }

        /**
         * 3. Remover
         */
        if (remove.length) {
            await tx.productionOrderInput.deleteMany({
                where: {
                    enterpriseId,
                    productionOrderId,
                    id: { in: remove },
                },
            });
        }

        /**
         * 4. Atualizar
         */
        for (const item of update) {
            await tx.productionOrderInput.update({
                where: { id: item.id },
                data: {
                    productId: typeof item.productId === "number" ? item.productId : undefined,

                    quantity: item.quantity !== undefined ? new Decimal(item.quantity) : undefined,

                    unitCost:
                        item.unitCost !== undefined
                            ? item.unitCost === null
                                ? null
                                : new Decimal(item.unitCost)
                            : undefined,
                },
            });
        }

        /**
         * 5. Criar
         */
        for (const item of create) {
            await tx.productionOrderInput.create({
                data: {
                    ...(env.ENVIRONMENT !== "PRODUCTION" && typeof item.id === "number"
                        ? { id: item.id }
                        : {}),

                    enterpriseId,
                    productionOrderId,

                    productId: item.productId,
                    quantity: new Decimal(item.quantity),

                    unitCost:
                        item.unitCost !== undefined && item.unitCost !== null
                            ? new Decimal(item.unitCost)
                            : null,
                },
            });
        }
    }
}
