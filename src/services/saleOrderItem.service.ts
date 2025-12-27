import { prisma } from "@config/prisma";
import { BaseService } from "@services/base.service";
import { AppError } from "@utils/appError";
import { Decimal } from "@prisma/client/runtime/library";
import { saleOrderItemAllowedSortFields } from "@routes/saleOrderItem.routes";

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
        saleOrderId?: number,
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
                    ...(typeof saleOrderId === "number" ? { saleOrderId } : {}),
                    ...(search
                        ? {
                              OR: [
                                  { product: { name: { contains: search } } },
                                  { product: { barcode: { contains: search } } },
                              ],
                          }
                        : {}),
                };

                const validSortFields = saleOrderItemAllowedSortFields;
                const safeSortBy = validSortFields.includes(sortBy) ? sortBy : "createdAt";
                const safeSortOrder = sortOrder === "asc" ? "asc" : "desc";

                const [items, total] = await prisma.$transaction([
                    prisma.saleOrderItem.findMany({
                        where,
                        include: { saleOrder: true, product: true },
                        skip,
                        take: limit,
                        orderBy: { [safeSortBy]: safeSortOrder },
                    }),
                    prisma.saleOrderItem.count({ where }),
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
                            ...(process.env.ENVIRONMENT !== "PRODUCTION" &&
                            typeof data.id === "number"
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

    update = async (id: number, enterpriseId: number, data: SaleOrderItemInput, userId: number) =>
        this.safeQuery(
            async () => {
                const existing = await prisma.saleOrderItem.findFirst({
                    where: { id, enterpriseId },
                });
                if (!existing)
                    throw new AppError(
                        "Item do pedido não encontrado",
                        404,
                        "SALE_ORDER_ITEM:update"
                    );

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
