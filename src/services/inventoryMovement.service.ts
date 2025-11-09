import { prisma } from "@config/prisma";
import { env } from "@config/env";
import { BaseService } from "@services/base.service";
import { AppError } from "@utils/appError";
import { MovementType, MovementSource } from "@prisma/client";

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
    getAll = async (enterpriseId: number, page = 1, limit = 10, productId: number) =>
        this.safeQuery(
            async () => {
                const skip = (page - 1) * limit;

                const [movements, total] = await prisma.$transaction([
                    prisma.inventoryMovement.findMany({
                        where: { enterpriseId, productId },
                        include: { product: true, warehouse: true, supplier: true },
                        skip,
                        take: limit,
                        orderBy: { createdAt: "desc" },
                    }),
                    prisma.inventoryMovement.count({ where: { enterpriseId, productId } }),
                ]);

                return {
                    movements,
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
                    where: { id, enterpriseId } as unknown as { id: number },
                    include: { product: true, warehouse: true, supplier: true },
                }),
            "INVENTORY_MOVEMENT:getById",
            enterpriseId
        );

    create = async (enterpriseId: number, data: InventoryMovementInput, userId: number) =>
        this.safeQuery(
            async () => {
                const [product, warehouse, supplier] = await Promise.all([
                    prisma.product.findFirst({
                        where: { id: data.productId, enterpriseId },
                        select: { id: true },
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
                    const inventoryMovement = await tx.inventoryMovement.create({
                        data: {
                            ...(env.ENVIRONMENT !== "PRODUCTION" && typeof data.id === "number"
                                ? { id: data.id }
                                : {}),
                            enterpriseId,
                            ...data,
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
