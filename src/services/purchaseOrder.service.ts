import { prisma } from "@config/prisma";
import { BaseService } from "@services/base.service";
import { AppError } from "@utils/appError";
import { MovementSource, MovementType, OrderStatus } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
import { purchaseOrderAllowedSortFields } from "@routes/purchaseOrder.routes";
import { NestedItemsPayload, normalizeNestedItemsPayload } from "@utils/nestedItems";
import { InventoryMovementService } from "@services/inventoryMovement.service";

export interface PurchaseOrderInput {
    id?: number;
    supplierId: number;
    warehouseId: number;
    code: string;
    status?: OrderStatus;
    notes?: string | null;
    items?: PurchaseOrderItemsPayload;
}

export interface PurchaseOrderItemCreateData {
    id?: number;
    productId: number;
    quantity: number;
    unitCost: number;
}

export interface PurchaseOrderItemUpdateData {
    id: number;
    productId?: number;
    quantity?: number;
    unitCost?: number;
}

export type PurchaseOrderItemsPayload = NestedItemsPayload<
    PurchaseOrderItemCreateData,
    PurchaseOrderItemUpdateData
>;

const inventoryService = new InventoryMovementService();

export class PurchaseOrderService extends BaseService {
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
                                  { supplier: { person: { name: { contains: search } } } },
                                  { supplier: { person: { taxId: { contains: search } } } },
                              ],
                          }
                        : {}),
                };

                const validSortFields = purchaseOrderAllowedSortFields;
                const safeSortBy = validSortFields.includes(sortBy) ? sortBy : "createdAt";
                const safeSortOrder = sortOrder === "asc" ? "asc" : "desc";

                const [orders, total] = await prisma.$transaction([
                    prisma.purchaseOrder.findMany({
                        where,
                        include: { supplier: { include: { person: true } }, items: true },
                        skip,
                        take: limit,
                        orderBy: { [safeSortBy]: safeSortOrder },
                    }),
                    prisma.purchaseOrder.count({ where }),
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
            "PURCHASE_ORDER:getAll",
            enterpriseId
        );

    getById = async (id: number, enterpriseId: number) =>
        this.safeQuery(
            async () =>
                prisma.purchaseOrder.findUnique({
                    where: { id, enterpriseId },
                    include: { supplier: { include: { person: true } }, items: true },
                }),
            "PURCHASE_ORDER:getById",
            enterpriseId
        );

    create = async (enterpriseId: number, data: PurchaseOrderInput, userId: number) =>
        this.safeQuery(
            async () => {
                const [codeTaken, supplier] = await Promise.all([
                    prisma.purchaseOrder.findFirst({ where: { code: data.code } }),
                    prisma.supplier.findFirst({
                        where: { id: data.supplierId, enterpriseId },
                        select: { id: true },
                    }),
                ]);

                if (codeTaken) throw new AppError("Compra já existe", 409, "PURCHASE_ORDER:create");
                if (!supplier) throw new AppError("Fornecedor não encontrado", 404, "FK:NOT_FOUND");

                const created = await prisma.$transaction(async (tx) => {
                    const order = await tx.purchaseOrder.create({
                        data: {
                            ...(process.env.ENVIRONMENT !== "PRODUCTION" &&
                            typeof data.id === "number"
                                ? { id: data.id }
                                : {}),
                            enterpriseId,
                            supplierId: data.supplierId,
                            code: data.code,
                            status: data.status ?? OrderStatus.PENDING,
                            notes: data.notes ?? null,
                        },
                    });

                    await this.syncPurchaseItems(
                        tx,
                        enterpriseId,
                        { ...data, id: order.id },
                        data.items
                    );

                    await tx.audit.create({
                        data: {
                            userId,
                            enterpriseId,
                            action: `Created purchase order ${order.code}`,
                            entity: "PurchaseOrder",
                        },
                    });

                    return order;
                });

                return created;
            },
            "PURCHASE_ORDER:create",
            enterpriseId
        );

    update = async (id: number, enterpriseId: number, data: PurchaseOrderInput, userId: number) =>
        this.safeQuery(
            async () => {
                const existing = await prisma.purchaseOrder.findFirst({
                    where: { id, enterpriseId },
                });
                if (!existing)
                    throw new AppError("Compra não encontrada", 404, "PURCHASE_ORDER:update");

                if (data.code && data.code !== existing.code) {
                    const codeTaken = await prisma.purchaseOrder.findFirst({
                        where: { code: data.code },
                    });
                    if (codeTaken)
                        throw new AppError("Compra já existe", 409, "PURCHASE_ORDER:update:code");
                }

                if (data.supplierId) {
                    const supplier = await prisma.supplier.findFirst({
                        where: { id: data.supplierId, enterpriseId },
                        select: { id: true },
                    });
                    if (!supplier)
                        throw new AppError("Fornecedor não encontrado", 404, "FK:NOT_FOUND");
                }

                const updated = await prisma.$transaction(async (tx) => {
                    const resolvedOrderData = {
                        id,
                        supplierId: data.supplierId ?? existing.supplierId,
                        warehouseId: data.warehouseId,
                        code: data.code ?? existing.code,
                        status: data.status ?? existing.status,
                        notes: data.notes ?? existing.notes,
                    };

                    const order = await tx.purchaseOrder.update({
                        where: { id },
                        data: {
                            supplierId: resolvedOrderData.supplierId,
                            code: resolvedOrderData.code,
                            status: resolvedOrderData.status,
                            notes: resolvedOrderData.notes,
                            updatedAt: new Date(),
                        },
                    });

                    await this.syncPurchaseItems(tx, enterpriseId, resolvedOrderData, data.items);

                    await tx.audit.create({
                        data: {
                            userId,
                            enterpriseId,
                            action: `Updated purchase order ${order.code}`,
                            entity: "PurchaseOrder",
                        },
                    });

                    return order;
                });

                return updated;
            },
            "PURCHASE_ORDER:update",
            enterpriseId
        );

    private async syncPurchaseItems(
        tx: Prisma.TransactionClient,
        enterpriseId: number,
        purchaseOrder: PurchaseOrderInput,
        payload?: PurchaseOrderItemsPayload
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

        const products = await tx.product.findMany({
            where: { enterpriseId, id: { in: productIds } },
            select: { id: true, productInventory: { select: { quantity: true } } },
        });
        if (products.length !== productIds.length) {
            throw new AppError("Produto não encontrado", 404, "PURCHASE_ORDER:items:FK");
        }

        const targetIds = Array.from(new Set([...update.map((item) => item.id), ...remove]));
        if (targetIds.length) {
            const found = await tx.purchaseOrderItem.findMany({
                where: { enterpriseId, purchaseOrderId: purchaseOrder.id, id: { in: targetIds } },
                select: { id: true },
            });
            if (found.length !== targetIds.length) {
                throw new AppError(
                    "Item da compra não encontrado",
                    404,
                    "PURCHASE_ORDER:items:NOT_FOUND"
                );
            }
        }

        if (remove.length) {
            await tx.purchaseOrderItem.deleteMany({
                where: { enterpriseId, purchaseOrderId: purchaseOrder.id, id: { in: remove } },
            });
        }

        for (const item of update) {
            await tx.purchaseOrderItem.update({
                where: { id: item.id },
                data: {
                    productId: typeof item.productId === "number" ? item.productId : undefined,
                    quantity: item.quantity !== undefined ? new Decimal(item.quantity) : undefined,
                    unitCost: item.unitCost !== undefined ? new Decimal(item.unitCost) : undefined,
                },
            });
        }

        for (const item of create) {
            await tx.purchaseOrderItem.create({
                data: {
                    ...(process.env.ENVIRONMENT !== "PRODUCTION" && typeof item.id === "number"
                        ? { id: item.id }
                        : {}),
                    enterpriseId,
                    purchaseOrderId: purchaseOrder.id ?? 0,
                    productId: item.productId,
                    quantity: new Decimal(item.quantity),
                    unitCost: new Decimal(item.unitCost),
                },
            });

            await inventoryService.create(
                enterpriseId,
                {
                    productId: item.productId,
                    warehouseId: purchaseOrder.warehouseId,
                    direction: MovementType.IN,
                    source: MovementSource.PURCHASE,
                    quantity: item.quantity,
                    unitCost: item.unitCost,
                    reference: purchaseOrder.code,
                    notes: purchaseOrder.notes ?? null,
                    supplierId: purchaseOrder.supplierId ?? null,
                },
                tx
            );
        }
    }
}
