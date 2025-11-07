import { prisma } from "@config/prisma";
import { env } from "@config/env";
import { BaseService } from "@services/base.service";
import { AppError } from "@utils/appError";
import { ProductDefinitionType } from "@prisma/client";

export interface ProductDefinitionInput {
    id?: number;
    name: string;
    description?: string | null;
    type: ProductDefinitionType;
}

export class ProductDefinitionService extends BaseService {
    getAll = async (enterpriseId: number, page = 1, limit = 10) =>
        this.safeQuery(async () => {
            const skip = (page - 1) * limit;

            const [productDefinitions, total] = await prisma.$transaction([
                prisma.productDefinition.findMany({
                    where: { enterpriseId },
                    skip,
                    take: limit,
                    orderBy: { createdAt: "desc" },
                }),
                prisma.productDefinition.count({ where: { enterpriseId } }),
            ]);

            return {
                productDefinitions,
                meta: {
                    total,
                    page,
                    totalPages: Math.ceil(total / limit),
                },
            };
        }, "PRODUCT_DEFINITION:getAll");

    getById = async (id: number, enterpriseId: number) =>
        this.safeQuery(async () => {
            return prisma.productDefinition.findUnique({
                where: { id, enterpriseId },
            });
        }, "PRODUCT_DEFINITION:getById");

    create = async (enterpriseId: number, data: ProductDefinitionInput, userId: number) =>
        this.safeQuery(async () => {
            const exists = await prisma.productDefinition.findFirst({
                where: { enterpriseId, name: data.name },
            });
            if (exists)
                throw new AppError(
                    "A definição do produto já existe",
                    409,
                    "PRODUCT_DEFINITION:create"
                );

            const created = await prisma.$transaction(async (tx) => {
                const def = await tx.productDefinition.create({
                    data: {
                        ...(env.ENVIRONMENT !== "PRODUCTION" && typeof data.id === "number"
                            ? { id: data.id }
                            : {}),
                        enterpriseId,
                        name: data.name,
                        description: data.description ?? null,
                        type: data.type,
                    },
                });

                await tx.audit.create({
                    data: {
                        userId,
                        enterpriseId,
                        action: `Created product definition ${def.name}`,
                        entity: "ProductDefinition",
                    },
                });

                return def;
            });

            return created;
        }, "PRODUCT_DEFINITION:create");

    update = async (
        id: number,
        enterpriseId: number,
        data: ProductDefinitionInput,
        userId: number
    ) =>
        this.safeQuery(async () => {
            const existing = await prisma.productDefinition.findFirst({
                where: { id, enterpriseId },
            });
            if (!existing)
                throw new AppError(
                    "Definição do produto não encontrada",
                    404,
                    "PRODUCT_DEFINITION:update"
                );

            if (data.name && data.name !== existing.name) {
                const nameTaken = await prisma.productDefinition.findFirst({
                    where: { enterpriseId, name: data.name, NOT: { id } },
                });
                if (nameTaken)
                    throw new AppError(
                        "A definição do produto já existe",
                        409,
                        "PRODUCT_DEFINITION:update"
                    );
            }

            const updated = await prisma.$transaction(async (tx) => {
                const def = await tx.productDefinition.update({
                    where: { id },
                    data: { ...data, updatedAt: new Date() },
                });

                await tx.audit.create({
                    data: {
                        userId,
                        enterpriseId,
                        action: `Updated product definition ${def.name}`,
                        entity: "ProductDefinition",
                    },
                });

                return def;
            });

            return updated;
        }, "PRODUCT_DEFINITION:update");
}
