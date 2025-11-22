import { prisma } from "@config/prisma";
import { env } from "@config/env";
import { BaseService } from "@services/base.service";
import { AppError } from "@utils/appError";
import { MovementType } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";

export interface ProductInventoryInput {
    costValue: number;
    saleValue: number;
    quantity: number;
}

export interface ProductInput {
    id?: number;
    productDefinitionId?: number | null;
    unityId?: number | null;
    name: string;
    barcode?: string | null;
    inventory: ProductInventoryInput;
}

export class ProductService extends BaseService {
    getAll = async (
        enterpriseId: number,
        page = 1,
        limit = 10,
        includeInactive = false,
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
                    ...(includeInactive ? {} : {}),
                    ...(search
                        ? {
                              OR: [
                                  { name: { contains: search } },
                                  { barcode: { contains: search } },
                              ],
                          }
                        : {}),
                };

                const validSortFields = [
                    "name",
                    "barcode",
                    "costValue",
                    "saleValue",
                    "quantity",
                    "createdAt",
                    "updatedAt",
                ];

                const safeSortBy: string = validSortFields.includes(sortBy) ? sortBy : "createdAt";

                const safeSortOrder: "asc" | "desc" = sortOrder === "asc" ? "asc" : "desc";

                const [productsRaw, total] = await prisma.$transaction([
                    prisma.product.findMany({
                        where,
                        include: {
                            productDefinition: true,
                            unity: true,
                            productInventory: true,
                        },
                    }),
                    prisma.product.count({ where }),
                ]);

                const aggregatedFields = ["costValue", "saleValue", "quantity"];

                const productsWithInventory = productsRaw.map((p) => {
                    const inv = p.productInventory[0];

                    return {
                        ...p,
                        costValue: inv ? Number(inv.costValue) : 0,
                        saleValue: inv ? Number(inv.saleValue) : 0,
                        quantity: inv ? Number(inv.quantity) : 0,
                    };
                });

                const sortedProducts = [...productsWithInventory].sort((a, b) => {
                    const aValue = a[safeSortBy as keyof typeof a];
                    const bValue = b[safeSortBy as keyof typeof b];

                    if (aggregatedFields.includes(safeSortBy)) {
                        const av = aValue as number;
                        const bv = bValue as number;

                        return safeSortOrder === "asc" ? av - bv : bv - av;
                    }

                    if (aValue instanceof Date && bValue instanceof Date) {
                        return safeSortOrder === "asc"
                            ? aValue.getTime() - bValue.getTime()
                            : bValue.getTime() - aValue.getTime();
                    }

                    const av = String(aValue);
                    const bv = String(bValue);

                    return safeSortOrder === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
                });

                const paginated = sortedProducts.slice(skip, skip + limit);

                return {
                    products: paginated,
                    meta: {
                        total,
                        page,
                        totalPages: Math.ceil(total / limit),
                    },
                };
            },
            "PRODUCT:getAll",
            enterpriseId
        );

    getById = async (id: number, enterpriseId: number) =>
        this.safeQuery(
            async () => {
                const product = await prisma.product.findUnique({
                    where: { id, enterpriseId },
                    include: { productDefinition: true, unity: true, productInventory: true },
                });
                if (!product) throw new AppError("Produto não encontrado", 404, "PRODUCT:getById");
                return product;
            },
            "PRODUCT:getById",
            enterpriseId
        );

    create = async (enterpriseId: number, data: ProductInput, userId: number) =>
        this.safeQuery(
            async () => {
                const [productDefinition, unity] = await Promise.all([
                    prisma.productDefinition.findFirst({
                        where: { id: data.productDefinitionId ?? 0 },
                        select: { id: true },
                    }),

                    prisma.unity.findFirst({
                        where: { id: data.unityId ?? 0 },
                        select: { id: true },
                    }),
                ]);

                if (data.productDefinitionId && !productDefinition)
                    throw new AppError("Definição do produto não encontrada", 404, "FK:NOT_FOUND");

                if (data.unityId && !unity)
                    throw new AppError("Unidade do produto não encontrada", 404, "FK:NOT_FOUND");

                const created = await prisma.$transaction(async (tx) => {
                    const prod = await tx.product.create({
                        data: {
                            ...(env.ENVIRONMENT !== "PRODUCTION" && typeof data.id === "number"
                                ? { id: data.id }
                                : {}),
                            enterpriseId,
                            productDefinitionId: data.productDefinitionId ?? null,
                            unityId: data.unityId ?? null,
                            name: data.name,
                            barcode: data.barcode ?? null,
                        },
                    });

                    await tx.productInventory.create({
                        data: {
                            enterpriseId,
                            productId: prod.id,
                            costValue: data.inventory.costValue,
                            saleValue: data.inventory.saleValue,
                            quantity: data.inventory.quantity,
                        },
                    });

                    const warehouse = await tx.warehouse.findFirst({
                        where: { enterpriseId },
                    });
                    await tx.inventoryMovement.create({
                        data: {
                            direction: MovementType.IN,
                            quantity: data.inventory.quantity,
                            balance: new Decimal(data.inventory.quantity),
                            source: "ADJUSTMENT",
                            unitCost: data.inventory.costValue,
                            enterpriseId,
                            productId: prod.id,
                            warehouseId: warehouse!.id,
                        },
                    });

                    await tx.audit.create({
                        data: {
                            userId,
                            enterpriseId,
                            action: `Created product ${prod.name}`,
                            entity: "Product",
                        },
                    });

                    const full = await tx.product.findUnique({
                        where: { id: prod.id, enterpriseId },
                        include: { productDefinition: true, unity: true, productInventory: true },
                    });
                    return full!;
                });

                return created;
            },
            "PRODUCT:create",
            enterpriseId
        );

    update = async (id: number, enterpriseId: number, data: ProductInput, userId: number) =>
        this.safeQuery(
            async () => {
                if (data && data.productDefinitionId) {
                    const productDefinition = await prisma.productDefinition.findFirst({
                        where: { id: data.productDefinitionId },
                        select: { id: true },
                    });

                    if (!productDefinition)
                        throw new AppError(
                            "Definição do produto não encontrada",
                            404,
                            "FK:NOT_FOUND"
                        );
                }

                if (data && data.unityId) {
                    const unity = await prisma.unity.findFirst({
                        where: { id: data.unityId },
                        select: { id: true },
                    });

                    if (!unity)
                        throw new AppError(
                            "Unidade do produto não encontrada",
                            404,
                            "FK:NOT_FOUND"
                        );
                }

                const exists = await prisma.product.findFirst({
                    where: { id, enterpriseId },
                    include: {
                        productInventory: {
                            select: { quantity: true, costValue: true },
                        },
                    },
                });
                if (!exists) throw new AppError("Produto não encontrado", 404, "PRODUCT:update");

                const updated = await prisma.$transaction(async (tx) => {
                    await tx.product.update({
                        where: { id },
                        data: {
                            productDefinitionId: data.productDefinitionId ?? null,
                            unityId: data.unityId ?? null,
                            name: data.name,
                            barcode: data.barcode ?? null,
                            updatedAt: new Date(),
                        },
                    });

                    await tx.productInventory.upsert({
                        where: { enterpriseId_productId: { enterpriseId, productId: id } },
                        create: {
                            enterpriseId,
                            productId: id,
                            costValue: data.inventory.costValue,
                            saleValue: data.inventory.saleValue,
                            quantity: data.inventory.quantity,
                        },
                        update: {
                            costValue: data.inventory.costValue,
                            saleValue: data.inventory.saleValue,
                            quantity: data.inventory.quantity,
                            updatedAt: new Date(),
                        },
                    });

                    const warehouse = await tx.warehouse.findFirst({
                        where: { enterpriseId },
                    });
                    const currentQty = exists.productInventory?.[0]?.quantity ?? new Decimal(0);
                    const newQty = new Decimal(data.inventory.quantity);
                    const direction = newQty.greaterThan(currentQty)
                        ? MovementType.IN
                        : MovementType.OUT;
                    await tx.inventoryMovement.create({
                        data: {
                            direction,
                            quantity: newQty.minus(currentQty).abs(),
                            balance: newQty,
                            source: "ADJUSTMENT",
                            unitCost:
                                newQty.greaterThan(currentQty) && data.inventory.costValue
                                    ? new Decimal(data.inventory.costValue)
                                    : undefined,
                            enterpriseId,
                            productId: id,
                            warehouseId: warehouse!.id,
                        },
                    });

                    await tx.audit.create({
                        data: {
                            userId,
                            enterpriseId,
                            action: `Updated product ${data.name}`,
                            entity: "Product",
                        },
                    });

                    const full = await tx.product.findUnique({
                        where: { id, enterpriseId },
                        include: { productDefinition: true, unity: true, productInventory: true },
                    });
                    return full!;
                });

                return updated;
            },
            "PRODUCT:update",
            enterpriseId
        );
}
