import { prisma } from "@config/prisma";
import { env } from "@config/env";
import { BaseService } from "@services/base.service";
import { AppError } from "@utils/appError";

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
    getAll = async (enterpriseId: number, page = 1, limit = 10) =>
        this.safeQuery(async () => {
            const skip = (page - 1) * limit;

            const [products, total] = await prisma.$transaction([
                prisma.product.findMany({
                    where: { enterpriseId },
                    include: { productDefinition: true, unity: true, productInventory: true },
                    skip,
                    take: limit,
                    orderBy: { createdAt: "desc" },
                }),
                prisma.product.count({ where: { enterpriseId } }),
            ]);

            return {
                products,
                meta: {
                    total,
                    page,
                    totalPages: Math.ceil(total / limit),
                },
            };
        }, "PRODUCT:getAll");

    getById = async (id: number, enterpriseId: number) =>
        this.safeQuery(async () => {
            const product = await prisma.product.findUnique({
                where: { id, enterpriseId },
                include: { productDefinition: true, unity: true, productInventory: true },
            });
            if (!product) throw new AppError("Product not found", 404, "PRODUCT:getById");
            return product;
        }, "PRODUCT:getById");

    create = async (enterpriseId: number, data: ProductInput, userId: number) =>
        this.safeQuery(async () => {
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
        }, "PRODUCT:create");

    update = async (id: number, enterpriseId: number, data: ProductInput, userId: number) =>
        this.safeQuery(async () => {
            const exists = await prisma.product.findFirst({ where: { id, enterpriseId } });
            if (!exists) throw new AppError("Product not found", 404, "PRODUCT:update");

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
        }, "PRODUCT:update");
}
