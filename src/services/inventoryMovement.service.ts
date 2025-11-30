import { prisma } from "@config/prisma";
import { env } from "@config/env";
import { BaseService } from "@services/base.service";
import { AppError } from "@utils/appError";
import { MovementType, MovementSource } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
import { inventoryMovementAllowedSortFields } from "@routes/inventoryMovement.routes";

export interface InventoryAdjustmentInput {
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

    create = async (enterpriseId: number, data: InventoryMovementInput, userId: number) =>
        this.safeQuery(
            async () => {
                if (data.quantity <= 0)
                    throw new AppError(
                        "Quantidade deve ser maior que 0",
                        400,
                        "INVENTORY_MOVEMENT:quantity"
                    );
                const [product, warehouse, supplier] = await Promise.all([
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
                    prisma.supplier.findFirst({
                        where: { id: data.supplierId ?? 0, enterpriseId },
                        select: { id: true },
                    }),
                ]);

                if (!product) throw new AppError("Produto não encontrado", 404, "FK:NOT_FOUND");
                if (!warehouse) throw new AppError("Depósito não encontrado", 404, "FK:NOT_FOUND");
                if (data.supplierId && !supplier)
                    throw new AppError("Fornecedor não encontrado", 404, "FK:NOT_FOUND");

                const created = await prisma.$transaction(async (tx) => {
                    const currentQty = product.productInventory?.[0]?.quantity ?? new Decimal(0);
                    const movedQty = new Decimal(data.quantity);
                    const newBalance =
                        data.direction === MovementType.IN
                            ? currentQty.plus(movedQty)
                            : currentQty.minus(movedQty);

                    const inventoryMovement = await tx.inventoryMovement.create({
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
                                    : null,
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

                    return inventoryMovement;
                });

                return created;
            },
            "INVENTORY_MOVEMENT:create",
            enterpriseId
        );
}
