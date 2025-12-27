import { prisma } from "@config/prisma";
import { BaseService } from "@services/base.service";
import { AppError } from "@utils/appError";
import { Decimal } from "@prisma/client/runtime/library";
import {
    MovementSource,
    MovementType,
    Prisma,
    ProductionOrder,
    ProductionOrderStatus,
} from "@prisma/client";
import { productionOrderAllowedSortFields } from "@routes/productionOrder.routes";
import { NestedItemsPayload, normalizeNestedItemsPayload } from "@utils/nestedItems";
import { endOfDayUTC, startOfDayUTC } from "@utils/functions";

export interface ProductionOrderPayload {
    id?: number;

    code: string;
    recipeId: number;
    lotId?: number | null;

    status?: ProductionOrderStatus;

    warehouseId: number;
    plannedQty: number;
    producedQty?: number | null;
    wasteQty?: number | null;
    otherCosts?: number | null;

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
        sortOrder?: "asc" | "desc",
        productId?: number,
        startDateFrom?: Date,
        startDateTo?: Date,
        endDateFrom?: Date,
        endDateTo?: Date
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
                    ...(typeof productId === "number" ? { productId } : {}),

                    ...(startDateFrom || startDateTo
                        ? {
                              AND: [
                                  ...(startDateTo
                                      ? [
                                            {
                                                startDate: {
                                                    lte: endOfDayUTC(startDateTo),
                                                },
                                            },
                                        ]
                                      : []),

                                  ...(startDateFrom
                                      ? [
                                            {
                                                OR: [
                                                    { endDate: null },
                                                    {
                                                        endDate: {
                                                            gte: startOfDayUTC(startDateFrom),
                                                        },
                                                    },
                                                ],
                                            },
                                        ]
                                      : []),
                              ],
                          }
                        : {}),

                    ...(search
                        ? {
                              OR: [
                                  { code: { contains: search } },
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
                    include: {
                        recipe: { include: { product: { include: { unity: true } } } },
                        lot: true,
                        inputs: { include: { product: { include: { unity: true } } } },
                    },
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
                            ...(process.env.ENVIRONMENT !== "PRODUCTION" &&
                            typeof data.id === "number"
                                ? { id: data.id }
                                : {}),
                            enterpriseId,
                            code: data.code,
                            recipeId: data.recipeId,
                            warehouseId: data.warehouseId,
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
                            otherCosts:
                                data.otherCosts !== undefined && data.otherCosts !== null
                                    ? new Decimal(data.otherCosts)
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
                            otherCosts:
                                data.otherCosts !== undefined && data.otherCosts !== null
                                    ? new Decimal(data.otherCosts)
                                    : (existing.otherCosts ?? null),
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

                    const wasFinished = existing.status === ProductionOrderStatus.FINISHED;
                    if (!wasFinished && order.status === ProductionOrderStatus.FINISHED) {
                        const warehouse = await prisma.warehouse.findFirst({
                            where: { id: data.warehouseId, enterpriseId },
                            select: { id: true },
                        });

                        if (!warehouse) {
                            throw new AppError("Depósito não encontrado", 404, "FK:WAREHOUSE");
                        }

                        await this.finalizeProductionOrder(tx, enterpriseId, order, userId);
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

    private async finalizeProductionOrder(
        tx: Prisma.TransactionClient,
        enterpriseId: number,
        order: ProductionOrder,
        userId: number
    ) {
        if (!order.producedQty || order.producedQty.lte(0)) {
            throw new AppError(
                "Quantidade produzida inválida",
                400,
                "PRODUCTION_ORDER:FINALIZE:INVALID_QTY"
            );
        }

        if (!order.productId) {
            throw new AppError(
                "Produto final não definido na ordem",
                400,
                "PRODUCTION_ORDER:FINALIZE:NO_PRODUCT"
            );
        }

        const inputs = await tx.productionOrderInput.findMany({
            where: {
                enterpriseId,
                productionOrderId: order.id,
            },
            include: {
                product: {
                    include: {
                        productInventory: true,
                    },
                },
            },
        });

        if (!inputs.length) {
            throw new AppError(
                "Ordem não possui insumos",
                400,
                "PRODUCTION_ORDER:FINALIZE:NO_INPUTS"
            );
        }

        let totalProductionCost = new Decimal(0);
        const extraCosts = order.otherCosts ?? new Decimal(0);

        for (const input of inputs) {
            const inventory = input.product.productInventory?.[0];
            const currentQty = inventory?.quantity ?? new Decimal(0);

            const unitCost = input.unitCost ?? inventory?.costValue ?? new Decimal(0);

            const totalConsumedQty = new Decimal(input.quantity).mul(order.producedQty);

            if (currentQty.lt(totalConsumedQty)) {
                throw new AppError(
                    `Estoque insuficiente para ${input.product.name}`,
                    400,
                    "PRODUCTION_ORDER:FINALIZE:INSUFFICIENT_STOCK"
                );
            }

            const newBalance = currentQty.minus(totalConsumedQty);
            const inputTotalCost = totalConsumedQty.mul(unitCost);
            totalProductionCost = totalProductionCost.plus(inputTotalCost);

            await tx.inventoryMovement.create({
                data: {
                    enterpriseId,
                    productId: input.productId,
                    warehouseId: order.warehouseId,
                    lotId: null,
                    direction: MovementType.OUT,
                    source: MovementSource.PRODUCTION,
                    quantity: totalConsumedQty,
                    balance: newBalance,
                    unitCost,
                    reference: order.code,
                    notes: `Consumo de insumo na OP ${order.code}`,
                    supplierId: null,
                },
            });

            await tx.productInventory.update({
                where: {
                    enterpriseId_productId: {
                        enterpriseId,
                        productId: input.productId,
                    },
                },
                data: {
                    quantity: newBalance,
                },
            });
        }

        const producedQty = order.producedQty;
        const productionUnitCost = totalProductionCost.plus(extraCosts).div(producedQty);
        const finishedInventory = await tx.productInventory.findUnique({
            where: {
                enterpriseId_productId: {
                    enterpriseId,
                    productId: order.productId,
                },
            },
        });

        const currentFinishedQty = finishedInventory?.quantity ?? new Decimal(0);
        const currentCostValue = finishedInventory?.costValue ?? new Decimal(0);
        const newFinishedQty = currentFinishedQty.plus(producedQty);
        const newCostValue = currentFinishedQty.eq(0)
            ? productionUnitCost
            : currentFinishedQty
                  .mul(currentCostValue)
                  .plus(producedQty.mul(productionUnitCost))
                  .div(newFinishedQty);

        await tx.inventoryMovement.create({
            data: {
                enterpriseId,
                productId: order.productId,
                warehouseId: order.warehouseId,
                lotId: order.lotId ?? null,
                direction: MovementType.IN,
                source: MovementSource.PRODUCTION,
                quantity: producedQty,
                balance: newFinishedQty,
                unitCost: productionUnitCost,
                reference: order.code,
                notes: `Produção finalizada OP ${order.code}`,
                supplierId: null,
            },
        });

        await tx.productInventory.update({
            where: {
                enterpriseId_productId: {
                    enterpriseId,
                    productId: order.productId,
                },
            },
            data: {
                quantity: newFinishedQty,
                costValue: newCostValue,
            },
        });

        await tx.audit.create({
            data: {
                userId,
                enterpriseId,
                action: `Finalized production order ${order.code}`,
                entity: "ProductionOrder",
            },
        });
    }

    private async syncProductionOrderInputs(
        tx: Prisma.TransactionClient,
        enterpriseId: number,
        productionOrderId: number,
        payload?: ProductionOrderInputsPayload
    ) {
        if (!payload) return;

        const { create, update, delete: remove } = normalizeNestedItemsPayload(payload);

        if (!create.length && !update.length && !remove.length) return;

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

        if (remove.length) {
            await tx.productionOrderInput.deleteMany({
                where: {
                    enterpriseId,
                    productionOrderId,
                    id: { in: remove },
                },
            });
        }

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

        for (const item of create) {
            await tx.productionOrderInput.create({
                data: {
                    ...(process.env.ENVIRONMENT !== "PRODUCTION" && typeof item.id === "number"
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
