import { prisma } from "@config/prisma";
import { env } from "@config/env";
import { BaseService } from "@services/base.service";
import { AppError } from "@utils/appError";
import { Decimal } from "@prisma/client/runtime/library";

export interface SaleOrderItemInput {
    id?: number;
    saleOrderId: number;
    productId: number;
    quantity: number;
    unitPrice: number;
    productUnitPrice: number;
    unitCost: number;
}

export class SaleOrderItemService extends BaseService {
    getAll = async (
        enterpriseId: number,
        page = 1,
        limit = 10,
        saleOrderId?: number
    ) =>
        this.safeQuery(
            async () => {
                const skip = (page - 1) * limit;

                const [items, total] = await prisma.$transaction([
                    prisma.saleOrderItem.findMany({
                        where: { enterpriseId, ...(saleOrderId && { saleOrderId }) },
                        include: { saleOrder: true, product: true },
                        skip,
                        take: limit,
                        orderBy: { id: "desc" },
                    }),
                    prisma.saleOrderItem.count({ where: { enterpriseId, ...(saleOrderId && { saleOrderId }) } }),
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
            "SALE_ORDER_ITEM:getAll",
            enterpriseId
        );

    getById = async (id: number, enterpriseId: number) =>
        this.safeQuery(
            async () =>
                prisma.saleOrderItem.findUnique({
                    where: { id, enterpriseId },
                    include: { saleOrder: true, product: true },
                }),
            "SALE_ORDER_ITEM:getById",
            enterpriseId
        );

    create = async (enterpriseId: number, data: SaleOrderItemInput, userId: number) =>
        this.safeQuery(
            async () => {
                const [order, product] = await Promise.all([
                    prisma.saleOrder.findFirst({
                        where: { id: data.saleOrderId, enterpriseId },
                        select: { id: true },
                    }),
                    prisma.product.findFirst({
                        where: { id: data.productId, enterpriseId },
                        select: { id: true },
                    }),
                ]);

                if (!order) throw new AppError("Pedido não encontrado", 404, "FK:NOT_FOUND");
                if (!product) throw new AppError("Produto não encontrado", 404, "FK:NOT_FOUND");

                const created = await prisma.$transaction(async (tx) => {
                    const item = await tx.saleOrderItem.create({
                        data: {
                            ...(env.ENVIRONMENT !== "PRODUCTION" && typeof data.id === "number"
                                ? { id: data.id }
                                : {}),
                            enterpriseId,
                            saleOrderId: data.saleOrderId,
                            productId: data.productId,
                            quantity: new Decimal(data.quantity),
                            unitPrice: new Decimal(data.unitPrice),
                            productUnitPrice: new Decimal(data.productUnitPrice),
                            unitCost: new Decimal(data.unitCost),
                        },
                    });

                    await tx.audit.create({
                        data: {
                            userId,
                            enterpriseId,
                            action: `Added item ${data.productId} to sale order ${data.saleOrderId}`,
                            entity: "SaleOrderItem",
                        },
                    });

                    return item;
                });

                return created;
            },
            "SALE_ORDER_ITEM:create",
            enterpriseId
        );

    update = async (
        id: number,
        enterpriseId: number,
        data: SaleOrderItemInput,
        userId: number
    ) =>
        this.safeQuery(
            async () => {
                const existing = await prisma.saleOrderItem.findFirst({ where: { id, enterpriseId } });
                if (!existing)
                    throw new AppError("Item do pedido não encontrado", 404, "SALE_ORDER_ITEM:update");

                if (data.saleOrderId) {
                    const order = await prisma.saleOrder.findFirst({
                        where: { id: data.saleOrderId, enterpriseId },
                        select: { id: true },
                    });
                    if (!order) throw new AppError("Pedido não encontrado", 404, "FK:NOT_FOUND");
                }

                if (data.productId) {
                    const product = await prisma.product.findFirst({
                        where: { id: data.productId, enterpriseId },
                        select: { id: true },
                    });
                    if (!product) throw new AppError("Produto não encontrado", 404, "FK:NOT_FOUND");
                }

                const updated = await prisma.$transaction(async (tx) => {
                    const item = await tx.saleOrderItem.update({
                        where: { id },
                        data: {
                            saleOrderId: data.saleOrderId ?? existing.saleOrderId,
                            productId: data.productId ?? existing.productId,
                            quantity:
                                data.quantity !== undefined
                                    ? new Decimal(data.quantity)
                                    : existing.quantity,
                            unitPrice:
                                data.unitPrice !== undefined
                                    ? new Decimal(data.unitPrice)
                                    : existing.unitPrice,
                            productUnitPrice:
                                data.productUnitPrice !== undefined
                                    ? new Decimal(data.productUnitPrice)
                                    : existing.productUnitPrice,
                            unitCost:
                                data.unitCost !== undefined
                                    ? new Decimal(data.unitCost)
                                    : existing.unitCost,
                        },
                    });

                    await tx.audit.create({
                        data: {
                            userId,
                            enterpriseId,
                            action: `Updated sale order item ${id}`,
                            entity: "SaleOrderItem",
                        },
                    });

                    return item;
                });

                return updated;
            },
            "SALE_ORDER_ITEM:update",
            enterpriseId
        );
}

