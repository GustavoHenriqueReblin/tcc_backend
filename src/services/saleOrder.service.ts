import { prisma } from "@config/prisma";
import { BaseService } from "@services/base.service";
import { AppError } from "@utils/appError";
import { MovementSource, MovementType, OrderStatus } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
import { saleOrderAllowedSortFields } from "@routes/saleOrder.routes";
import { NestedItemsPayload, normalizeNestedItemsPayload } from "@utils/nestedItems";
import { InventoryMovementService } from "@services/inventoryMovement.service";
import { endOfDayUTC, startOfDayUTC } from "@utils/functions";

export interface SaleOrderInput {
    id?: number;
    customerId: number;
    warehouseId: number;
    code: string;
    status?: OrderStatus;
    totalValue: number;
    discount?: number;
    otherCosts?: number;
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

const inventoryService = new InventoryMovementService();

export class SaleOrderService extends BaseService {
    getAll = async (
        enterpriseId: number,
        page = 1,
        limit = 10,
        status?: OrderStatus,
        search?: string | null,
        sortBy?: string,
        sortOrder?: "asc" | "desc",
        customerId?: number,
        createdAtFrom?: Date,
        createdAtTo?: Date
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
                    ...(typeof customerId === "number" ? { customerId } : {}),
                    ...(createdAtFrom || createdAtTo
                        ? {
                              createdAt: {
                                  ...(createdAtFrom ? { gte: createdAtFrom } : {}),
                                  ...(createdAtTo ? { lte: createdAtTo } : {}),
                              },
                          }
                        : {}),
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

                const [orders, total, ordersForTotals] = await prisma.$transaction([
                    prisma.saleOrder.findMany({
                        where,
                        include: {
                            customer: { include: { person: true } },
                            items: true,
                        },
                        skip,
                        take: limit,
                        orderBy: { [safeSortBy]: safeSortOrder },
                    }),
                    prisma.saleOrder.count({ where }),
                    prisma.saleOrder.findMany({
                        where,
                        select: {
                            discount: true,
                            otherCosts: true,
                            items: {
                                select: {
                                    quantity: true,
                                    productUnitPrice: true,
                                },
                            },
                        },
                    }),
                ]);

                let subtotal = 0;
                let discount = 0;
                let otherCosts = 0;

                for (const order of ordersForTotals) {
                    discount += Number(order.discount ?? 0);
                    otherCosts += Number(order.otherCosts ?? 0);

                    for (const item of order.items) {
                        subtotal += Number(item.quantity ?? 0) * Number(item.productUnitPrice ?? 0);
                    }
                }

                const totals = {
                    subtotal,
                    discount,
                    otherCosts,
                    total: subtotal - discount + otherCosts,
                };

                return {
                    items: orders,
                    meta: {
                        total,
                        page,
                        totalPages: Math.ceil(total / limit),
                    },
                    totals,
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
                    include: {
                        customer: { include: { person: true } },
                        items: {
                            include: {
                                product: { include: { productInventory: true, unity: true } },
                            },
                        },
                    },
                }),
            "SALE_ORDER:getById",
            enterpriseId
        );

    create = async (enterpriseId: number, data: SaleOrderInput, userId: number) =>
        this.safeQuery(
            async () => {
                const discountValue = new Decimal(data.discount ?? 0);
                const otherCostsValue = new Decimal(data.otherCosts ?? 0);
                const status = data.status ?? OrderStatus.PENDING;

                const [codeTaken, customer, warehouse] = await Promise.all([
                    prisma.saleOrder.findFirst({ where: { code: data.code } }),
                    prisma.customer.findFirst({
                        where: { id: data.customerId, enterpriseId },
                        select: { id: true },
                    }),
                    prisma.warehouse.findFirst({
                        where: { id: data.warehouseId, enterpriseId },
                        select: { id: true },
                    }),
                ]);

                if (codeTaken) throw new AppError("Venda já existe", 409, "SALE_ORDER:create");
                if (!customer) throw new AppError("Cliente não encontrado", 404, "FK:NOT_FOUND");
                if (!warehouse) throw new AppError("Depósito não encontrado", 404, "FK:WAREHOUSE");

                const created = await prisma.$transaction(async (tx) => {
                    const order = await tx.saleOrder.create({
                        data: {
                            ...(process.env.ENVIRONMENT !== "PRODUCTION" &&
                            typeof data.id === "number"
                                ? { id: data.id }
                                : {}),
                            enterpriseId,
                            customerId: data.customerId,
                            warehouseId: data.warehouseId,
                            code: data.code,
                            status,
                            totalValue: new Decimal(data.totalValue),
                            discount: discountValue,
                            otherCosts: otherCostsValue,
                            notes: data.notes ?? null,
                        },
                    });

                    await this.syncSaleOrderItems(tx, enterpriseId, order.id, data.items);

                    if (status === OrderStatus.FINISHED) {
                        await this.finalizeSaleOrder(tx, enterpriseId, order.id);
                    }

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
                if (!existing) throw new AppError("Venda não encontrada", 404, "SALE_ORDER:update");

                if (data.code && data.code !== existing.code) {
                    const codeTaken = await prisma.saleOrder.findFirst({
                        where: { code: data.code },
                    });
                    if (codeTaken)
                        throw new AppError("Venda já existe", 409, "SALE_ORDER:update:code");
                }

                if (data.customerId) {
                    const customer = await prisma.customer.findFirst({
                        where: { id: data.customerId, enterpriseId },
                        select: { id: true },
                    });
                    if (!customer)
                        throw new AppError("Cliente não encontrado", 404, "FK:NOT_FOUND");
                }

                const status = data.status ?? existing.status;
                const warehouseId = data.warehouseId ?? existing.warehouseId ?? null;

                const warehouse = await prisma.warehouse.findFirst({
                    where: { id: warehouseId, enterpriseId },
                    select: { id: true },
                });

                if (!warehouse) {
                    throw new AppError("Depósito não encontrado", 404, "FK:WAREHOUSE");
                }

                const discountValue =
                    data.discount !== undefined
                        ? new Decimal(data.discount)
                        : (existing.discount ?? new Decimal(0));
                const otherCostsValue =
                    data.otherCosts !== undefined
                        ? new Decimal(data.otherCosts)
                        : (existing.otherCosts ?? new Decimal(0));

                const updated = await prisma.$transaction(async (tx) => {
                    const order = await tx.saleOrder.update({
                        where: { id },
                        data: {
                            customerId: data.customerId ?? existing.customerId,
                            warehouseId,
                            code: data.code ?? existing.code,
                            status,
                            totalValue:
                                data.totalValue !== undefined
                                    ? new Decimal(data.totalValue)
                                    : existing.totalValue,
                            discount: discountValue,
                            otherCosts: otherCostsValue,
                            notes: data.notes ?? existing.notes,
                            updatedAt: new Date(),
                        },
                    });

                    await this.syncSaleOrderItems(tx, enterpriseId, order.id, data.items);

                    const wasFinished = existing.status === OrderStatus.FINISHED;
                    const isFinishing = !wasFinished && status === OrderStatus.FINISHED;
                    const isCancelingFinished = wasFinished && status === OrderStatus.CANCELED;

                    if (isFinishing) {
                        await this.finalizeSaleOrder(tx, enterpriseId, order.id);
                    }

                    if (isCancelingFinished) {
                        await this.revertSaleOrderInventory(
                            tx,
                            enterpriseId,
                            order.id,
                            warehouse.id
                        );
                    }

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

        let productsMap = new Map<
            number,
            { costValue: Decimal | null; saleValue: Decimal | null }
        >();
        if (productIds.length) {
            const products = await tx.product.findMany({
                where: { enterpriseId, id: { in: productIds } },
                select: {
                    id: true,
                    productInventory: { select: { costValue: true, saleValue: true } },
                },
            });

            if (products.length !== productIds.length) {
                throw new AppError("Produto não encontrado", 404, "SALE_ORDER:items:FK");
            }

            productsMap = new Map(
                products.map((p) => [
                    p.id,
                    {
                        costValue: p.productInventory?.[0]?.costValue ?? null,
                        saleValue: p.productInventory?.[0]?.saleValue ?? null,
                    },
                ])
            );
        }

        const targetIds = Array.from(new Set([...update.map((item) => item.id), ...remove]));
        if (targetIds.length) {
            const found = await tx.saleOrderItem.findMany({
                where: { enterpriseId, saleOrderId, id: { in: targetIds } },
                select: { id: true },
            });

            if (found.length !== targetIds.length) {
                throw new AppError(
                    "Item da venda não encontrado",
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
            const productData = productsMap.get(item.productId) ?? {
                costValue: null,
                saleValue: null,
            };
            const resolvedUnitCost =
                item.unitCost !== undefined ? item.unitCost : (productData.costValue ?? 0);
            const resolvedProductUnitPrice =
                item.productUnitPrice !== undefined
                    ? item.productUnitPrice
                    : (productData.saleValue ?? 0);
            const resolvedUnitPrice =
                item.unitPrice !== undefined ? item.unitPrice : (productData.saleValue ?? 0);

            await tx.saleOrderItem.create({
                data: {
                    ...(process.env.ENVIRONMENT !== "PRODUCTION" && typeof item.id === "number"
                        ? { id: item.id }
                        : {}),
                    enterpriseId,
                    saleOrderId,
                    productId: item.productId,
                    quantity: new Decimal(item.quantity),
                    unitPrice: new Decimal(resolvedUnitPrice),
                    productUnitPrice: new Decimal(resolvedProductUnitPrice),
                    unitCost: new Decimal(resolvedUnitCost),
                },
            });
        }
    }

    private async finalizeSaleOrder(
        tx: Prisma.TransactionClient,
        enterpriseId: number,
        orderId: number
    ) {
        const order = await tx.saleOrder.findUnique({
            where: { id: orderId, enterpriseId },
            include: {
                items: { include: { product: { select: { name: true } } } },
                warehouse: true,
            },
        });

        if (!order) throw new AppError("Venda não encontrada", 404, "SALE_ORDER:FINALIZE");
        if (!order.items.length) {
            throw new AppError("Venda não possui itens", 400, "SALE_ORDER:FINALIZE:NO_ITEMS");
        }

        if (!order.warehouseId) {
            throw new AppError(
                "Venda precisa de depósito para movimentar estoque",
                400,
                "SALE_ORDER:WAREHOUSE_REQUIRED"
            );
        }

        const warehouse =
            order.warehouse ??
            (await tx.warehouse.findFirst({
                where: { enterpriseId, id: order.warehouseId },
                select: { id: true },
            }));

        if (!warehouse) {
            throw new AppError("Depósito não encontrado", 404, "FK:WAREHOUSE");
        }

        const productTotals = new Map<number, Decimal>();
        const productNames = new Map<number, string>();

        for (const item of order.items) {
            const currentTotal = productTotals.get(item.productId) ?? new Decimal(0);
            productTotals.set(item.productId, currentTotal.plus(new Decimal(item.quantity)));
            productNames.set(item.productId, item.product?.name ?? `ID ${item.productId}`);
        }

        const productIds = Array.from(productTotals.keys());
        const inventories = productIds.length
            ? await tx.productInventory.findMany({
                  where: { enterpriseId, productId: { in: productIds } },
                  select: { productId: true, quantity: true },
              })
            : [];

        const inventoryMap = new Map(
            inventories.map((inventory) => [inventory.productId, new Decimal(inventory.quantity)])
        );

        for (const [productId, requiredQty] of productTotals.entries()) {
            const availableQty = inventoryMap.get(productId) ?? new Decimal(0);
            if (availableQty.lt(requiredQty)) {
                const productName = productNames.get(productId) ?? `ID ${productId}`;
                throw new AppError(
                    `Estoque insuficiente para o produto ${productName}`,
                    400,
                    "SALE_ORDER:INSUFFICIENT_STOCK"
                );
            }
        }

        for (const item of order.items) {
            const quantity = new Decimal(item.quantity);
            const unitCost = new Decimal(item.unitCost);
            const saleValue = new Decimal(item.unitPrice);

            await inventoryService.create(
                enterpriseId,
                {
                    productId: item.productId,
                    warehouseId: warehouse.id,
                    saleOrderId: order.id,
                    direction: MovementType.OUT,
                    source: MovementSource.SALE,
                    quantity: quantity.toNumber(),
                    unitCost: unitCost.toNumber(),
                    saleValue: saleValue.toNumber(),
                    reference: "Venda " + order.code,
                    notes: order.notes ?? null,
                },
                tx
            );
        }
    }

    private async revertSaleOrderInventory(
        tx: Prisma.TransactionClient,
        enterpriseId: number,
        orderId: number,
        warehouseId: number
    ) {
        const order = await tx.saleOrder.findUnique({
            where: { id: orderId, enterpriseId },
            include: { items: true },
        });

        if (!order) throw new AppError("Venda não encontrada", 404, "SALE_ORDER:CANCEL");
        if (!order.items.length) return;

        for (const item of order.items) {
            const quantity = new Decimal(item.quantity);
            const unitCost = new Decimal(item.unitCost);
            const saleValue = new Decimal(item.unitPrice);

            await inventoryService.create(
                enterpriseId,
                {
                    productId: item.productId,
                    warehouseId,
                    saleOrderId: order.id,
                    direction: MovementType.IN,
                    source: MovementSource.SALE,
                    quantity: quantity.toNumber(),
                    unitCost: unitCost.toNumber(),
                    saleValue: saleValue.toNumber(),
                    reference: "Venda " + order.code,
                    notes: `Cancelamento da venda ${order.code}`,
                },
                tx
            );
        }
    }
}
