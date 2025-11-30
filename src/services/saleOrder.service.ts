import { prisma } from "@config/prisma";
import { env } from "@config/env";
import { BaseService } from "@services/base.service";
import { AppError } from "@utils/appError";
import { OrderStatus } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
import { saleOrderAllowedSortFields } from "@routes/saleOrder.routes";
import { NestedItemsPayload, normalizeNestedItemsPayload } from "@utils/nestedItems";

export interface SaleOrderInput {
    id?: number;
    customerId: number;
    code: string;
    status?: OrderStatus;
    totalValue: number;
    notes?: string | null;
    items?: SaleOrderItemsPayload;
}

export interface SaleOrderItemCreateData {
    id?: number;
    productId: number;
    quantity: number;
    unitPrice: number;
    productUnitPrice: number;
    unitCost: number;
}

export interface SaleOrderItemUpdateData {
    id: number;
    productId?: number;
    quantity?: number;
    unitPrice?: number;
    productUnitPrice?: number;
    unitCost?: number;
}

export type SaleOrderItemsPayload = NestedItemsPayload<
    SaleOrderItemCreateData,
    SaleOrderItemUpdateData
>;

export class SaleOrderService extends BaseService {
    getAll = async (
        enterpriseId: number,
        page = 1,
        limit = 10,
        status?: OrderStatus,
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
                    ...(status ? { status } : {}),
                    ...(search
                        ? {
                              OR: [
                                  { code: { contains: search } },
                                  { customer: { person: { name: { contains: search } } } },
                                  { customer: { person: { taxId: { contains: search } } } },
                              ],
                          }
                        : {}),
                };

                const validSortFields = saleOrderAllowedSortFields;
                const safeSortBy = validSortFields.includes(sortBy) ? sortBy : "createdAt";
                const safeSortOrder = sortOrder === "asc" ? "asc" : "desc";

                const [orders, total] = await prisma.$transaction([
                    prisma.saleOrder.findMany({
                        where,
                        include: { customer: { include: { person: true } }, items: true },
                        skip,
                        take: limit,
                        orderBy: { [safeSortBy]: safeSortOrder },
                    }),
                    prisma.saleOrder.count({ where }),
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
            "SALE_ORDER:getAll",
            enterpriseId
        );

    getById = async (id: number, enterpriseId: number) =>
        this.safeQuery(
            async () =>
                prisma.saleOrder.findUnique({
                    where: { id, enterpriseId },
                    include: { customer: { include: { person: true } }, items: true },
                }),
            "SALE_ORDER:getById",
            enterpriseId
        );

    create = async (enterpriseId: number, data: SaleOrderInput, userId: number) =>
        this.safeQuery(
            async () => {
                const [codeTaken, customer] = await Promise.all([
                    prisma.saleOrder.findFirst({ where: { code: data.code } }),
                    prisma.customer.findFirst({
                        where: { id: data.customerId, enterpriseId },
                        select: { id: true },
                    }),
                ]);

                if (codeTaken) throw new AppError("Pedido já existe", 409, "SALE_ORDER:create");
                if (!customer) throw new AppError("Cliente não encontrado", 404, "FK:NOT_FOUND");

                const created = await prisma.$transaction(async (tx) => {
                    const order = await tx.saleOrder.create({
                        data: {
                            ...(env.ENVIRONMENT !== "PRODUCTION" && typeof data.id === "number"
                                ? { id: data.id }
                                : {}),
                            enterpriseId,
                            customerId: data.customerId,
                            code: data.code,
                            status: data.status ?? OrderStatus.PENDING,
                            totalValue: new Decimal(data.totalValue),
                            notes: data.notes ?? null,
                        },
                    });

                    await this.syncSaleOrderItems(tx, enterpriseId, order.id, data.items);

                    await tx.audit.create({
                        data: {
                            userId,
                            enterpriseId,
                            action: `Created sale order ${order.code}`,
                            entity: "SaleOrder",
                        },
                    });

                    return order;
                });

                return created;
            },
            "SALE_ORDER:create",
            enterpriseId
        );

    update = async (id: number, enterpriseId: number, data: SaleOrderInput, userId: number) =>
        this.safeQuery(
            async () => {
                const existing = await prisma.saleOrder.findFirst({ where: { id, enterpriseId } });
                if (!existing)
                    throw new AppError("Pedido não encontrado", 404, "SALE_ORDER:update");

                if (data.code && data.code !== existing.code) {
                    const codeTaken = await prisma.saleOrder.findFirst({
                        where: { code: data.code },
                    });
                    if (codeTaken)
                        throw new AppError("Pedido já existe", 409, "SALE_ORDER:update:code");
                }

                if (data.customerId) {
                    const customer = await prisma.customer.findFirst({
                        where: { id: data.customerId, enterpriseId },
                        select: { id: true },
                    });
                    if (!customer)
                        throw new AppError("Cliente não encontrado", 404, "FK:NOT_FOUND");
                }

                const updated = await prisma.$transaction(async (tx) => {
                    const order = await tx.saleOrder.update({
                        where: { id },
                        data: {
                            customerId: data.customerId ?? existing.customerId,
                            code: data.code ?? existing.code,
                            status: data.status ?? existing.status,
                            totalValue:
                                data.totalValue !== undefined
                                    ? new Decimal(data.totalValue)
                                    : existing.totalValue,
                            notes: data.notes ?? existing.notes,
                            updatedAt: new Date(),
                        },
                    });

                    await this.syncSaleOrderItems(tx, enterpriseId, order.id, data.items);

                    await tx.audit.create({
                        data: {
                            userId,
                            enterpriseId,
                            action: `Updated sale order ${order.code}`,
                            entity: "SaleOrder",
                        },
                    });

                    return order;
                });

                return updated;
            },
            "SALE_ORDER:update",
            enterpriseId
        );

    private async syncSaleOrderItems(
        tx: Prisma.TransactionClient,
        enterpriseId: number,
        saleOrderId: number,
        payload?: SaleOrderItemsPayload
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
                where: { enterpriseId, id: { in: productIds } },
                select: { id: true },
            });

            if (products.length !== productIds.length) {
                throw new AppError("Produto não encontrado", 404, "SALE_ORDER:items:FK");
            }
        }

        const targetIds = Array.from(new Set([...update.map((item) => item.id), ...remove]));
        if (targetIds.length) {
            const found = await tx.saleOrderItem.findMany({
                where: { enterpriseId, saleOrderId, id: { in: targetIds } },
                select: { id: true },
            });

            if (found.length !== targetIds.length) {
                throw new AppError(
                    "Item do pedido não encontrado",
                    404,
                    "SALE_ORDER:items:NOT_FOUND"
                );
            }
        }

        if (remove.length) {
            await tx.saleOrderItem.deleteMany({
                where: { enterpriseId, saleOrderId, id: { in: remove } },
            });
        }

        for (const item of update) {
            await tx.saleOrderItem.update({
                where: { id: item.id },
                data: {
                    productId: typeof item.productId === "number" ? item.productId : undefined,
                    quantity: item.quantity !== undefined ? new Decimal(item.quantity) : undefined,
                    unitPrice:
                        item.unitPrice !== undefined ? new Decimal(item.unitPrice) : undefined,
                    productUnitPrice:
                        item.productUnitPrice !== undefined
                            ? new Decimal(item.productUnitPrice)
                            : undefined,
                    unitCost: item.unitCost !== undefined ? new Decimal(item.unitCost) : undefined,
                },
            });
        }

        for (const item of create) {
            await tx.saleOrderItem.create({
                data: {
                    ...(env.ENVIRONMENT !== "PRODUCTION" && typeof item.id === "number"
                        ? { id: item.id }
                        : {}),
                    enterpriseId,
                    saleOrderId,
                    productId: item.productId,
                    quantity: new Decimal(item.quantity),
                    unitPrice: new Decimal(item.unitPrice),
                    productUnitPrice: new Decimal(item.productUnitPrice),
                    unitCost: new Decimal(item.unitCost),
                },
            });
        }
    }
}
