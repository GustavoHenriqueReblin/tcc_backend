import { prisma } from "@config/prisma";
import { env } from "@config/env";
import { BaseService } from "@services/base.service";
import { AppError } from "@utils/appError";
import { Decimal } from "@prisma/client/runtime/library";

export interface ProductionOrderInputInput {
    id?: number;
    productionOrderId: number;
    productId: number;
    quantity: number;
    unitCost?: number | null;
}

export class ProductionOrderInputService extends BaseService {
    getAll = async (
        enterpriseId: number,
        page = 1,
        limit = 10,
        productionOrderId?: number
    ) =>
        this.safeQuery(
            async () => {
                const skip = (page - 1) * limit;

                const [items, total] = await prisma.$transaction([
                    prisma.productionOrderInput.findMany({
                        where: { enterpriseId, ...(productionOrderId && { productionOrderId }) },
                        include: { productionOrder: true, product: true },
                        skip,
                        take: limit,
                        orderBy: { id: "desc" },
                    }),
                    prisma.productionOrderInput.count({ where: { enterpriseId, ...(productionOrderId && { productionOrderId }) } }),
                ]);

                return {
                    items,
                    meta: {
                        total,
                        page,
                        totalPages: Math.ceil(total / limit),
                    },
                };
            },
            "PRODUCTION_ORDER_INPUT:getAll",
            enterpriseId
        );

    getById = async (id: number, enterpriseId: number) =>
        this.safeQuery(
            async () =>
                prisma.productionOrderInput.findUnique({
                    where: { id, enterpriseId },
                    include: { productionOrder: true, product: true },
                }),
            "PRODUCTION_ORDER_INPUT:getById",
            enterpriseId
        );

    create = async (
        enterpriseId: number,
        data: ProductionOrderInputInput,
        userId: number
    ) =>
        this.safeQuery(
            async () => {
                const [order, product] = await Promise.all([
                    prisma.productionOrder.findFirst({
                        where: { id: data.productionOrderId, enterpriseId },
                        select: { id: true },
                    }),
                    prisma.product.findFirst({
                        where: { id: data.productId, enterpriseId },
                        select: { id: true },
                    }),
                ]);

                if (!order)
                    throw new AppError("Ordem de produção não encontrada", 404, "FK:NOT_FOUND");
                if (!product) throw new AppError("Produto não encontrado", 404, "FK:NOT_FOUND");

                const created = await prisma.$transaction(async (tx) => {
                    const item = await tx.productionOrderInput.create({
                        data: {
                            ...(env.ENVIRONMENT !== "PRODUCTION" && typeof data.id === "number"
                                ? { id: data.id }
                                : {}),
                            enterpriseId,
                            productionOrderId: data.productionOrderId,
                            productId: data.productId,
                            quantity: new Decimal(data.quantity),
                            unitCost:
                                data.unitCost !== undefined && data.unitCost !== null
                                    ? new Decimal(data.unitCost)
                                    : null,
                        },
                    });

                    await tx.audit.create({
                        data: {
                            userId,
                            enterpriseId,
                            action: `Added input ${data.productId} to production order ${data.productionOrderId}`,
                            entity: "ProductionOrderInput",
                        },
                    });

                    return item;
                });

                return created;
            },
            "PRODUCTION_ORDER_INPUT:create",
            enterpriseId
        );

    update = async (
        id: number,
        enterpriseId: number,
        data: ProductionOrderInputInput,
        userId: number
    ) =>
        this.safeQuery(
            async () => {
                const existing = await prisma.productionOrderInput.findFirst({
                    where: { id, enterpriseId },
                });
                if (!existing)
                    throw new AppError(
                        "Item de insumo da ordem não encontrado",
                        404,
                        "PRODUCTION_ORDER_INPUT:update"
                    );

                if (data.productionOrderId) {
                    const order = await prisma.productionOrder.findFirst({
                        where: { id: data.productionOrderId, enterpriseId },
                        select: { id: true },
                    });
                    if (!order)
                        throw new AppError(
                            "Ordem de produção não encontrada",
                            404,
                            "FK:NOT_FOUND"
                        );
                }

                if (data.productId) {
                    const product = await prisma.product.findFirst({
                        where: { id: data.productId, enterpriseId },
                        select: { id: true },
                    });
                    if (!product) throw new AppError("Produto não encontrado", 404, "FK:NOT_FOUND");
                }

                const updated = await prisma.$transaction(async (tx) => {
                    const item = await tx.productionOrderInput.update({
                        where: { id },
                        data: {
                            productionOrderId:
                                data.productionOrderId ?? existing.productionOrderId,
                            productId: data.productId ?? existing.productId,
                            quantity:
                                data.quantity !== undefined
                                    ? new Decimal(data.quantity)
                                    : existing.quantity,
                            unitCost:
                                data.unitCost !== undefined && data.unitCost !== null
                                    ? new Decimal(data.unitCost)
                                    : existing.unitCost,
                        },
                    });

                    await tx.audit.create({
                        data: {
                            userId,
                            enterpriseId,
                            action: `Updated production order input ${id}`,
                            entity: "ProductionOrderInput",
                        },
                    });

                    return item;
                });

                return updated;
            },
            "PRODUCTION_ORDER_INPUT:update",
            enterpriseId
        );
}

