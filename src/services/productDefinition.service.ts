import { prisma } from "@config/prisma";
import { BaseService } from "@services/base.service";
import { AppError } from "@utils/appError";
import { ProductDefinitionType } from "@prisma/client";
import { productDefinitionAllowedSortFields } from "@routes/productDefinition.routes";

const DUPLICATE_NAME_ERROR = "A definição do produto já existe";
const DUPLICATE_TYPE_ERROR = "Já existe definição para este tipo de produto";
const NOT_FOUND_ERROR = "Definição do produto nao encontrada";

export interface ProductDefinitionInput {
    id?: number;
    name: string;
    description?: string | null;
    type: ProductDefinitionType;
}

export class ProductDefinitionService extends BaseService {
    getAll = async (
        enterpriseId: number,
        page = 1,
        limit = 10,
        search?: string | null,
        sortBy?: string,
        sortOrder?: "asc" | "desc",
        type?: ProductDefinitionType
    ) =>
        this.safeQuery(
            async () => {
                search = search?.trim() || null;
                sortBy = sortBy || "createdAt";
                sortOrder = sortOrder || "desc";
                const skip = (page - 1) * limit;

                const where = {
                    enterpriseId,
                    ...(type ? { type } : {}),
                    ...(search
                        ? {
                              OR: [
                                  { name: { contains: search } },
                                  { description: { contains: search } },
                              ],
                          }
                        : {}),
                };

                const validSortFields = productDefinitionAllowedSortFields;
                const safeSortBy = validSortFields.includes(sortBy) ? sortBy : "createdAt";
                const safeSortOrder = sortOrder === "asc" ? "asc" : "desc";

                const [productDefinitions, total] = await prisma.$transaction([
                    prisma.productDefinition.findMany({
                        where,
                        skip,
                        take: limit,
                        orderBy: { [safeSortBy]: safeSortOrder },
                    }),
                    prisma.productDefinition.count({ where }),
                ]);

                return {
                    items: productDefinitions,
                    meta: {
                        total,
                        page,
                        totalPages: Math.ceil(total / limit),
                    },
                };
            },
            "PRODUCT_DEFINITION:getAll",
            enterpriseId
        );

    getById = async (id: number, enterpriseId: number) =>
        this.safeQuery(
            async () => {
                return prisma.productDefinition.findUnique({
                    where: { id, enterpriseId },
                });
            },
            "PRODUCT_DEFINITION:getById",
            enterpriseId
        );

    create = async (enterpriseId: number, data: ProductDefinitionInput, userId: number) =>
        this.safeQuery(
            async () => {
                const [nameTaken, typeTaken] = await Promise.all([
                    prisma.productDefinition.findFirst({
                        where: { enterpriseId, name: data.name },
                    }),
                    prisma.productDefinition.findFirst({
                        where: { enterpriseId, type: data.type },
                    }),
                ]);

                if (nameTaken)
                    throw new AppError(DUPLICATE_NAME_ERROR, 409, "PRODUCT_DEFINITION:create");
                if (typeTaken)
                    throw new AppError(DUPLICATE_TYPE_ERROR, 409, "PRODUCT_DEFINITION:create");

                const created = await prisma.$transaction(async (tx) => {
                    const def = await tx.productDefinition.create({
                        data: {
                            ...(process.env.ENVIRONMENT !== "PRODUCTION" &&
                            typeof data.id === "number"
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
            },
            "PRODUCT_DEFINITION:create",
            enterpriseId
        );

    update = async (
        id: number,
        enterpriseId: number,
        data: ProductDefinitionInput,
        userId: number
    ) =>
        this.safeQuery(
            async () => {
                const existing = await prisma.productDefinition.findFirst({
                    where: { id, enterpriseId },
                });
                if (!existing)
                    throw new AppError(NOT_FOUND_ERROR, 404, "PRODUCT_DEFINITION:update");

                if (data.name && data.name !== existing.name) {
                    const nameTaken = await prisma.productDefinition.findFirst({
                        where: { enterpriseId, name: data.name, NOT: { id } },
                    });
                    if (nameTaken)
                        throw new AppError(DUPLICATE_NAME_ERROR, 409, "PRODUCT_DEFINITION:update");
                }

                const typeTaken = await prisma.productDefinition.findFirst({
                    where: { enterpriseId, type: data.type, NOT: { id } },
                });
                if (typeTaken)
                    throw new AppError(DUPLICATE_TYPE_ERROR, 409, "PRODUCT_DEFINITION:update");

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
            },
            "PRODUCT_DEFINITION:update",
            enterpriseId
        );
}
