import { prisma } from "@config/prisma";
import { env } from "@config/env";
import { BaseService } from "@services/base.service";
import { AppError } from "@utils/appError";
import { PaymentMethod, PaymentStatus } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";

export interface AccountsReceivableInput {
    id?: number;
    customerId?: number | null;
    saleOrderId?: number | null;
    description?: string | null;
    value: number;
    dueDate: Date;
    paymentDate?: Date | null;
    method?: PaymentMethod | null;
    status?: PaymentStatus;
    notes?: string | null;
}

export class AccountsReceivableService extends BaseService {
    getAll = async (enterpriseId: number, page = 1, limit = 10, status?: PaymentStatus) =>
        this.safeQuery(
            async () => {
                const skip = (page - 1) * limit;

                const [receivables, total] = await prisma.$transaction([
                    prisma.accountsReceivable.findMany({
                        where: { enterpriseId, ...(status && { status }) },
                        include: {
                            customer: { include: { person: true } },
                            saleOrder: true,
                            transactions: true,
                        },
                        skip,
                        take: limit,
                        orderBy: { createdAt: "desc" },
                    }),
                    prisma.accountsReceivable.count({
                        where: { enterpriseId, ...(status && { status }) },
                    }),
                ]);

                return {
                    receivables,
                    meta: {
                        total,
                        page,
                        totalPages: Math.ceil(total / limit),
                    },
                };
            },
            "ACCOUNTS_RECEIVABLE:getAll",
            enterpriseId
        );

    getById = async (id: number, enterpriseId: number) =>
        this.safeQuery(
            async () =>
                prisma.accountsReceivable.findUnique({
                    where: { id, enterpriseId },
                    include: {
                        customer: { include: { person: true } },
                        saleOrder: true,
                        transactions: true,
                    },
                }),
            "ACCOUNTS_RECEIVABLE:getById",
            enterpriseId
        );

    create = async (enterpriseId: number, data: AccountsReceivableInput, userId: number) =>
        this.safeQuery(
            async () => {
                if (data.value <= 0) {
                    throw new AppError(
                        "Valor deve ser maior que 0",
                        400,
                        "ACCOUNTS_RECEIVABLE:create:value"
                    );
                }

                const [customer, saleOrder] = await Promise.all([
                    prisma.customer.findFirst({
                        where: { id: data.customerId ?? 0, enterpriseId },
                        select: { id: true },
                    }),
                    prisma.saleOrder.findFirst({
                        where: { id: data.saleOrderId ?? 0, enterpriseId },
                        select: { id: true },
                    }),
                ]);

                if (data.customerId && !customer) {
                    throw new AppError("Cliente não encontrado", 404, "FK:NOT_FOUND");
                }

                if (data.saleOrderId && !saleOrder) {
                    throw new AppError("Pedido não encontrado", 404, "FK:NOT_FOUND");
                }

                const created = await prisma.$transaction(async (tx) => {
                    const receivable = await tx.accountsReceivable.create({
                        data: {
                            ...(env.ENVIRONMENT !== "PRODUCTION" && typeof data.id === "number"
                                ? { id: data.id }
                                : {}),
                            enterpriseId,
                            customerId: data.customerId ?? null,
                            saleOrderId: data.saleOrderId ?? null,
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
                            action: `Created accounts receivable ${receivable.id}`,
                            entity: "AccountsReceivable",
                        },
                    });

                    return receivable;
                });

                return created;
            },
            "ACCOUNTS_RECEIVABLE:create",
            enterpriseId
        );

    update = async (
        id: number,
        enterpriseId: number,
        data: AccountsReceivableInput,
        userId: number
    ) =>
        this.safeQuery(
            async () => {
                const existing = await prisma.accountsReceivable.findFirst({
                    where: { id, enterpriseId },
                });

                if (!existing) {
                    throw new AppError(
                        "Conta a receber não encontrada",
                        404,
                        "ACCOUNTS_RECEIVABLE:update"
                    );
                }

                if (data.value !== undefined && data.value <= 0) {
                    throw new AppError(
                        "Valor deve ser maior que 0",
                        400,
                        "ACCOUNTS_RECEIVABLE:update:value"
                    );
                }

                if (data.customerId) {
                    const customer = await prisma.customer.findFirst({
                        where: { id: data.customerId, enterpriseId },
                        select: { id: true },
                    });
                    if (!customer) {
                        throw new AppError("Cliente não encontrado", 404, "FK:NOT_FOUND");
                    }
                }

                if (data.saleOrderId) {
                    const saleOrder = await prisma.saleOrder.findFirst({
                        where: { id: data.saleOrderId, enterpriseId },
                        select: { id: true },
                    });
                    if (!saleOrder) {
                        throw new AppError("Pedido não encontrado", 404, "FK:NOT_FOUND");
                    }
                }

                const updated = await prisma.$transaction(async (tx) => {
                    const receivable = await tx.accountsReceivable.update({
                        where: { id },
                        data: {
                            customerId: data.customerId ?? existing.customerId,
                            saleOrderId: data.saleOrderId ?? existing.saleOrderId,
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
                            action: `Updated accounts receivable ${receivable.id}`,
                            entity: "AccountsReceivable",
                        },
                    });

                    return receivable;
                });

                return updated;
            },
            "ACCOUNTS_RECEIVABLE:update",
            enterpriseId
        );
}
