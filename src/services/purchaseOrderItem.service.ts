import { prisma } from "@config/prisma";
import { BaseService } from "@services/base.service";
import { AppError } from "@utils/appError";
import { Decimal } from "@prisma/client/runtime/library";
import { purchaseOrderItemAllowedSortFields } from "@routes/purchaseOrderItem.routes";

export interface PurchaseOrderItemInput {
    id?: number;
    purchaseOrderId: number;
    productId: number;
    quantity: number;
    unitCost: number;
}

export class PurchaseOrderItemService extends BaseService {
    getAll = async (
        enterpriseId: number,
        page = 1,
        limit = 10,
        purchaseOrderId?: number,
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
                    ...(typeof purchaseOrderId === "number" ? { purchaseOrderId } : {}),
                    ...(search
                        ? {
                              OR: [
                                  { product: { name: { contains: search } } },
                                  { product: { barcode: { contains: search } } },
                              ],
                          }
                        : {}),
                };

                const validSortFields = purchaseOrderItemAllowedSortFields;
                const safeSortBy = validSortFields.includes(sortBy) ? sortBy : "createdAt";
                const safeSortOrder = sortOrder === "asc" ? "asc" : "desc";

                const [items, total] = await prisma.$transaction([
                    prisma.purchaseOrderItem.findMany({
                        where,
                        include: { purchaseOrder: true, product: true },
                        skip,
                        take: limit,
                        orderBy: { [safeSortBy]: safeSortOrder },
                    }),
                    prisma.purchaseOrderItem.count({ where }),
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
            "PURCHASE_ORDER_ITEM:getAll",
            enterpriseId
        );

    getById = async (id: number, enterpriseId: number) =>
        this.safeQuery(
            async () =>
                prisma.purchaseOrderItem.findUnique({
                    where: { id, enterpriseId },
                    include: { purchaseOrder: true, product: true },
                }),
            "PURCHASE_ORDER_ITEM:getById",
            enterpriseId
        );

    create = async (enterpriseId: number, data: PurchaseOrderItemInput, userId: number) =>
        this.safeQuery(
            async () => {
                const [order, product] = await Promise.all([
                    prisma.purchaseOrder.findFirst({
                        where: { id: data.purchaseOrderId, enterpriseId },
                        select: { id: true },
                    }),
                    prisma.product.findFirst({
                        where: { id: data.productId, enterpriseId },
                        select: { id: true },
                    }),
                ]);

                if (!order) throw new AppError("Compra não encontrada", 404, "FK:NOT_FOUND");
                if (!product) throw new AppError("Produto não encontrado", 404, "FK:NOT_FOUND");

                const created = await prisma.$transaction(async (tx) => {
                    const item = await tx.purchaseOrderItem.create({
                        data: {
                            ...(process.env.ENVIRONMENT !== "PRODUCTION" &&
                            typeof data.id === "number"
                                ? { id: data.id }
                                : {}),
                            enterpriseId,
                            purchaseOrderId: data.purchaseOrderId,
                            productId: data.productId,
                            quantity: new Decimal(data.quantity),
                            unitCost: new Decimal(data.unitCost),
                        },
                    });

                    await tx.audit.create({
                        data: {
                            userId,
                            enterpriseId,
                            action: `Added item ${data.productId} to purchase order ${data.purchaseOrderId}`,
                            entity: "PurchaseOrderItem",
                        },
                    });

                    return item;
                });

                return created;
            },
            "PURCHASE_ORDER_ITEM:create",
            enterpriseId
        );

    update = async (
        id: number,
        enterpriseId: number,
        data: PurchaseOrderItemInput,
        userId: number
    ) =>
        this.safeQuery(
            async () => {
                const existing = await prisma.purchaseOrderItem.findFirst({
                    where: { id, enterpriseId },
                });
                if (!existing)
                    throw new AppError(
                        "Item da compra não encontrado",
                        404,
                        "PURCHASE_ORDER_ITEM:update"
                    );

                if (data.purchaseOrderId) {
                    const order = await prisma.purchaseOrder.findFirst({
                        where: { id: data.purchaseOrderId, enterpriseId },
                        select: { id: true },
                    });
                    if (!order) throw new AppError("Compra não encontrada", 404, "FK:NOT_FOUND");
                }

                if (data.productId) {
                    const product = await prisma.product.findFirst({
                        where: { id: data.productId, enterpriseId },
                        select: { id: true },
                    });
                    if (!product) throw new AppError("Produto não encontrado", 404, "FK:NOT_FOUND");
                }

                const updated = await prisma.$transaction(async (tx) => {
                    const item = await tx.purchaseOrderItem.update({
                        where: { id },
                        data: {
                            purchaseOrderId: data.purchaseOrderId ?? existing.purchaseOrderId,
                            productId: data.productId ?? existing.productId,
                            quantity:
                                data.quantity !== undefined
                                    ? new Decimal(data.quantity)
                                    : existing.quantity,
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
                            action: `Updated purchase order item ${id}`,
                            entity: "PurchaseOrderItem",
                        },
                    });

                    return item;
                });

                return updated;
            },
            "PURCHASE_ORDER_ITEM:update",
            enterpriseId
        );
}
