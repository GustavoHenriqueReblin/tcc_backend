import { prisma } from "@config/prisma";
import { BaseService } from "@services/base.service";
import { AppError } from "@utils/appError";
import { PaymentMethod, PaymentStatus } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
import { accountsPayableAllowedSortFields } from "@routes/accountsPayable.routes";

export interface AccountsPayableInput {
    id?: number;
    supplierId?: number | null;
    purchaseOrderId?: number | null;
    description?: string | null;
    value: number;
    dueDate: Date;
    paymentDate?: Date | null;
    method?: PaymentMethod | null;
    status?: PaymentStatus;
    notes?: string | null;
}

export class AccountsPayableService extends BaseService {
    getAll = async (
        enterpriseId: number,
        page = 1,
        limit = 10,
        status?: PaymentStatus,
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
                                  { description: { contains: search } },
                                  { supplier: { person: { name: { contains: search } } } },
                                  { supplier: { person: { taxId: { contains: search } } } },
                                  { purchaseOrder: { code: { contains: search } } },
                              ],
                          }
                        : {}),
                };

                const validSortFields = accountsPayableAllowedSortFields;
                const safeSortBy = validSortFields.includes(sortBy) ? sortBy : "createdAt";
                const safeSortOrder = sortOrder === "asc" ? "asc" : "desc";

                const [payables, total] = await prisma.$transaction([
                    prisma.accountsPayable.findMany({
                        where,
                        include: {
                            supplier: { include: { person: true } },
                            purchaseOrder: true,
                            transactions: true,
                        },
                        skip,
                        take: limit,
                        orderBy: { [safeSortBy]: safeSortOrder },
                    }),
                    prisma.accountsPayable.count({ where }),
                ]);

                return {
                    items: payables,
                    meta: {
                        total,
                        page,
                        totalPages: Math.ceil(total / limit),
                    },
                };
            },
            "ACCOUNTS_PAYABLE:getAll",
            enterpriseId
        );

    getById = async (id: number, enterpriseId: number) =>
        this.safeQuery(
            async () =>
                prisma.accountsPayable.findUnique({
                    where: { id, enterpriseId },
                    include: {
                        supplier: { include: { person: true } },
                        purchaseOrder: true,
                        transactions: true,
                    },
                }),
            "ACCOUNTS_PAYABLE:getById",
            enterpriseId
        );

    create = async (enterpriseId: number, data: AccountsPayableInput, userId: number) =>
        this.safeQuery(
            async () => {
                if (data.value <= 0) {
                    throw new AppError(
                        "Valor deve ser maior que 0",
                        400,
                        "ACCOUNTS_PAYABLE:create:value"
                    );
                }

                const [supplier, purchaseOrder] = await Promise.all([
                    prisma.supplier.findFirst({
                        where: { id: data.supplierId ?? 0, enterpriseId },
                        select: { id: true },
                    }),
                    prisma.purchaseOrder.findFirst({
                        where: { id: data.purchaseOrderId ?? 0, enterpriseId },
                        select: { id: true },
                    }),
                ]);

                if (data.supplierId && !supplier) {
                    throw new AppError("Fornecedor não encontrado", 404, "FK:NOT_FOUND");
                }

                if (data.purchaseOrderId && !purchaseOrder) {
                    throw new AppError("Compra não encontrada", 404, "FK:NOT_FOUND");
                }

                const created = await prisma.$transaction(async (tx) => {
                    const payable = await tx.accountsPayable.create({
                        data: {
                            ...(process.env.ENVIRONMENT !== "PRODUCTION" &&
                            typeof data.id === "number"
                                ? { id: data.id }
                                : {}),
                            enterpriseId,
                            supplierId: data.supplierId ?? null,
                            purchaseOrderId: data.purchaseOrderId ?? null,
                            description: data.description ?? null,
                            value: new Decimal(data.value),
                            dueDate: data.dueDate,
                            paymentDate: data.paymentDate ?? null,
                            method: data.method ?? null,
                            status: data.status ?? PaymentStatus.PENDING,
                            notes: data.notes ?? null,
                        },
                    });

                    await tx.audit.create({
                        data: {
                            userId,
                            enterpriseId,
                            action: `Created accounts payable ${payable.id}`,
                            entity: "AccountsPayable",
                        },
                    });

                    return payable;
                });

                return created;
            },
            "ACCOUNTS_PAYABLE:create",
            enterpriseId
        );

    update = async (id: number, enterpriseId: number, data: AccountsPayableInput, userId: number) =>
        this.safeQuery(
            async () => {
                const existing = await prisma.accountsPayable.findFirst({
                    where: { id, enterpriseId },
                });

                if (!existing) {
                    throw new AppError(
                        "Conta a pagar não encontrada",
                        404,
                        "ACCOUNTS_PAYABLE:update"
                    );
                }

                if (data.value !== undefined && data.value <= 0) {
                    throw new AppError(
                        "Valor deve ser maior que 0",
                        400,
                        "ACCOUNTS_PAYABLE:update:value"
                    );
                }

                if (data.supplierId) {
                    const supplier = await prisma.supplier.findFirst({
                        where: { id: data.supplierId, enterpriseId },
                        select: { id: true },
                    });
                    if (!supplier) {
                        throw new AppError("Fornecedor não encontrado", 404, "FK:NOT_FOUND");
                    }
                }

                if (data.purchaseOrderId) {
                    const purchaseOrder = await prisma.purchaseOrder.findFirst({
                        where: { id: data.purchaseOrderId, enterpriseId },
                        select: { id: true },
                    });
                    if (!purchaseOrder) {
                        throw new AppError("Compra não encontrada", 404, "FK:NOT_FOUND");
                    }
                }

                const updated = await prisma.$transaction(async (tx) => {
                    const payable = await tx.accountsPayable.update({
                        where: { id },
                        data: {
                            supplierId: data.supplierId ?? existing.supplierId,
                            purchaseOrderId: data.purchaseOrderId ?? existing.purchaseOrderId,
                            description: data.description ?? existing.description,
                            value:
                                data.value !== undefined ? new Decimal(data.value) : existing.value,
                            dueDate: data.dueDate ?? existing.dueDate,
                            paymentDate: data.paymentDate ?? existing.paymentDate,
                            method: data.method ?? existing.method,
                            status: data.status ?? existing.status,
                            notes: data.notes ?? existing.notes,
                            updatedAt: new Date(),
                        },
                    });

                    await tx.audit.create({
                        data: {
                            userId,
                            enterpriseId,
                            action: `Updated accounts payable ${payable.id}`,
                            entity: "AccountsPayable",
                        },
                    });

                    return payable;
                });

                return updated;
            },
            "ACCOUNTS_PAYABLE:update",
            enterpriseId
        );
}
