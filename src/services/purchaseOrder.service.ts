import { prisma } from "@config/prisma";
import { env } from "@config/env";
import { BaseService } from "@services/base.service";
import { AppError } from "@utils/appError";
import { OrderStatus } from "@prisma/client";
import { purchaseOrderAllowedSortFields } from "@routes/purchaseOrder.routes";

export interface PurchaseOrderInput {
    id?: number;
    supplierId: number;
    code: string;
    status?: OrderStatus;
    notes?: string | null;
}

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
                            ...(env.ENVIRONMENT !== "PRODUCTION" && typeof data.id === "number"
                                ? { id: data.id }
                                : {}),
                            enterpriseId,
                            supplierId: data.supplierId,
                            code: data.code,
                            status: data.status ?? OrderStatus.PENDING,
                            notes: data.notes ?? null,
                        },
                    });

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
                    const order = await tx.purchaseOrder.update({
                        where: { id },
                        data: {
                            supplierId: data.supplierId ?? existing.supplierId,
                            code: data.code ?? existing.code,
                            status: data.status ?? existing.status,
                            notes: data.notes ?? existing.notes,
                            updatedAt: new Date(),
                        },
                    });

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
}
