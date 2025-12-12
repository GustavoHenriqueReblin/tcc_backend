import { prisma } from "@config/prisma";
import { env } from "@config/env";
import { BaseService } from "@services/base.service";
import { AppError } from "@utils/appError";
import { MovementType, MovementSource, Prisma } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
import { inventoryMovementAllowedSortFields } from "@routes/inventoryMovement.routes";

export interface InventoryAdjustmentInput {
    productId: number;
    quantity: number;
    warehouseId: number;
    notes?: string;
}

export interface HarvestInput {
    productId: number;
    quantity: number;
    warehouseId: number;
    notes?: string;
}

export interface InventoryMovementInput {
    id?: number;
    productId: number;
    warehouseId: number;
    lotId?: number | null;
    direction: MovementType;
    source: MovementSource;
    quantity: number;
    unitCost?: number | null;
    reference?: string | null;
    notes?: string | null;
    supplierId?: number | null;
}

export class InventoryMovementService extends BaseService {
    getAll = async (
        enterpriseId: number,
        page = 1,
        limit = 10,
        productId: number,
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
                    productId,
                    ...(search ? { reference: { contains: search } } : {}),
                };

                const validSortFields = inventoryMovementAllowedSortFields;
                const safeSortBy = validSortFields.includes(sortBy) ? sortBy : "createdAt";
                const safeSortOrder = sortOrder === "asc" ? "asc" : "desc";

                const [movements, total] = await prisma.$transaction([
                    prisma.inventoryMovement.findMany({
                        where,
                        include: { product: true, warehouse: true, supplier: true },
                        skip,
                        take: limit,
                        orderBy: { [safeSortBy]: safeSortOrder },
                    }),
                    prisma.inventoryMovement.count({ where }),
                ]);

                return {
                    items: movements,
                    meta: {
                        total,
                        page,
                        totalPages: Math.ceil(total / limit),
                    },
                };
            },
            "INVENTORY_MOVEMENT:getAll",
            enterpriseId
        );

    getById = async (id: number, enterpriseId: number) =>
        this.safeQuery(
            async () =>
                prisma.inventoryMovement.findUnique({
                    where: { id, enterpriseId },
                    include: { product: true, warehouse: true, supplier: true },
                }),
            "INVENTORY_MOVEMENT:getById",
            enterpriseId
        );

    createAdjustment = async (
        enterpriseId: number,
        data: InventoryAdjustmentInput,
        userId: number
    ) =>
        this.safeQuery(
            async () => {
                const [product, warehouse] = await Promise.all([
                    prisma.product.findFirst({
                        where: { id: data.productId, enterpriseId },
                        include: {
                            productInventory: {
                                select: { quantity: true, costValue: true },
                            },
                        },
                    }),
                    prisma.warehouse.findFirst({
                        where: { id: data.warehouseId, enterpriseId },
                        select: { id: true },
                    }),
                ]);

                if (!product) throw new AppError("Produto não encontrado", 404, "FK:NOT_FOUND");
                if (!warehouse) throw new AppError("Depósito não encontrado", 404, "FK:NOT_FOUND");

                const currentQty = product.productInventory?.[0]?.quantity ?? new Decimal(0);
                const targetQty = new Decimal(data.quantity);
                const difference = targetQty.minus(currentQty);

                if (difference.isZero()) {
                    throw new AppError(
                        "Quantidade informada deve ser diferente do estoque atual",
                        400,
                        "INVENTORY_MOVEMENT:ADJUSTMENT_NO_CHANGE"
                    );
                }

                const direction = difference.isPositive() ? MovementType.IN : MovementType.OUT;
                const movedQty = difference.abs();
                const unitCost = product.productInventory?.[0]?.costValue ?? new Decimal(0);

                const created = await prisma.$transaction(async (tx) => {
                    const inventoryMovement = await tx.inventoryMovement.create({
                        data: {
                            enterpriseId,
                            productId: data.productId,
                            warehouseId: data.warehouseId,
                            lotId: null,
                            direction,
                            source: MovementSource.ADJUSTMENT,
                            quantity: movedQty,
                            balance: targetQty,
                            unitCost,
                            reference: null,
                            notes: data.notes ?? null,
                            supplierId: null,
                        },
                    });

                    await tx.productInventory.update({
                        where: {
                            enterpriseId_productId: { enterpriseId, productId: data.productId },
                        },
                        data: { quantity: targetQty },
                    });

                    return inventoryMovement;
                });

                return created;
            },
            "INVENTORY_MOVEMENT:createAdjustment",
            enterpriseId
        );

    createHarvestEntry = async (enterpriseId: number, data: HarvestInput, userId: number) =>
        this.safeQuery(
            async () => {
                if (data.quantity <= 0) {
                    throw new AppError(
                        "Quantidade colhida deve ser maior que zero",
                        400,
                        "HARVEST:INVALID_QUANTITY"
                    );
                }

                const [product, warehouse] = await Promise.all([
                    prisma.product.findFirst({
                        where: { id: data.productId, enterpriseId },
                        include: {
                            productInventory: {
                                select: { quantity: true, costValue: true },
                            },
                        },
                    }),
                    prisma.warehouse.findFirst({
                        where: { id: data.warehouseId, enterpriseId },
                        select: { id: true },
                    }),
                ]);

                if (!product) throw new AppError("Produto não encontrado", 404, "FK:NOT_FOUND");
                if (!warehouse) throw new AppError("Depósito não encontrado", 404, "FK:NOT_FOUND");

                const currentQty = product.productInventory?.[0]?.quantity ?? new Decimal(0);

                const harvestedQty = new Decimal(data.quantity);
                const newBalance = currentQty.plus(harvestedQty);

                const unitCost = product.productInventory?.[0]?.costValue ?? new Decimal(0);

                const created = await prisma.$transaction(async (tx) => {
                    const inventoryMovement = await tx.inventoryMovement.create({
                        data: {
                            enterpriseId,
                            productId: data.productId,
                            warehouseId: data.warehouseId,
                            lotId: null,
                            direction: MovementType.IN,
                            source: MovementSource.HARVEST,
                            quantity: harvestedQty,
                            balance: newBalance,
                            unitCost,
                            reference: null,
                            notes: data.notes ?? null,
                            supplierId: null,
                        },
                    });

                    await tx.productInventory.update({
                        where: {
                            enterpriseId_productId: {
                                enterpriseId,
                                productId: data.productId,
                            },
                        },
                        data: {
                            quantity: newBalance,
                        },
                    });

                    return inventoryMovement;
                });

                return created;
            },
            "INVENTORY_MOVEMENT:createHarvestEntry",
            enterpriseId
        );

    create = async (
        enterpriseId: number,
        data: InventoryMovementInput,
        tx?: Prisma.TransactionClient
    ) =>
        this.safeQuery(
            async () => {
                if (tx) {
                    // já está dentro de transação → usa ela
                    return this._createInternal(tx, enterpriseId, data);
                }

                // não está em transação → cria uma transação
                return prisma.$transaction(async (trx) => {
                    return this._createInternal(trx, enterpriseId, data);
                });
            },
            "INVENTORY_MOVEMENT:create",
            enterpriseId
        );

    private async _createInternal(
        tx: Prisma.TransactionClient,
        enterpriseId: number,
        data: InventoryMovementInput
    ) {
        if (data.quantity <= 0) {
            throw new AppError(
                "Quantidade deve ser maior que 0",
                400,
                "INVENTORY_MOVEMENT:quantity"
            );
        }

        const [product, warehouse, supplier] = await Promise.all([
            tx.product.findFirst({
                where: { id: data.productId, enterpriseId },
                include: {
                    productInventory: {
                        select: { quantity: true, costValue: true },
                    },
                },
            }),
            tx.warehouse.findFirst({
                where: { id: data.warehouseId, enterpriseId },
                select: { id: true },
            }),
            tx.supplier.findFirst({
                where: { id: data.supplierId ?? 0, enterpriseId },
                select: { id: true },
            }),
        ]);

        if (!product) throw new AppError("Produto não encontrado", 404, "FK:NOT_FOUND");
        if (!warehouse) throw new AppError("Depósito não encontrado", 404, "FK:NOT_FOUND");
        if (data.supplierId && !supplier)
            throw new AppError("Fornecedor não encontrado", 404, "FK:NOT_FOUND");

        const currentQty = product.productInventory?.[0]?.quantity ?? new Decimal(0);
        const movedQty = new Decimal(data.quantity);
        const newBalance =
            data.direction === MovementType.IN
                ? currentQty.plus(movedQty)
                : currentQty.minus(movedQty);

        const movement = await tx.inventoryMovement.create({
            data: {
                ...(env.ENVIRONMENT !== "PRODUCTION" && typeof data.id === "number"
                    ? { id: data.id }
                    : {}),
                enterpriseId,
                productId: data.productId,
                warehouseId: data.warehouseId,
                lotId: data.lotId ?? null,
                direction: data.direction,
                source: data.source,
                quantity: movedQty,
                balance: newBalance,
                unitCost:
                    data.unitCost !== undefined && data.unitCost !== null
                        ? new Decimal(data.unitCost)
                        : product.productInventory[0].costValue,
                reference: data.reference ?? null,
                notes: data.notes ?? null,
                supplierId: data.supplierId ?? null,
            },
        });

        await tx.productInventory.update({
            where: {
                enterpriseId_productId: { enterpriseId, productId: data.productId },
            },
            data: {
                quantity: newBalance,
                ...(data.direction === MovementType.IN &&
                    data.unitCost && { costValue: new Decimal(data.unitCost) }),
            },
        });

        return movement;
    }
}
