import { prisma } from "@config/prisma";
import { env } from "@config/env";
import { BaseService } from "@services/base.service";
import { AppError } from "@utils/appError";
import { TransactionType } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
import { financialTransactionAllowedSortFields } from "@routes/financialTransaction.routes";

export interface FinancialTransactionInput {
    id?: number;
    type: TransactionType;
    value: number;
    date?: Date;
    category?: string | null;
    description?: string | null;
    accountsReceivableId?: number | null;
    accountsPayableId?: number | null;
    notes?: string | null;
}

export class FinancialTransactionService extends BaseService {
    getAll = async (
        enterpriseId: number,
        page = 1,
        limit = 10,
        type?: TransactionType,
        search?: string | null,
        sortBy?: string,
        sortOrder?: "asc" | "desc"
    ) =>
        this.safeQuery(
            async () => {
                search = search?.trim() || null;
                sortBy = sortBy || "date";
                sortOrder = sortOrder || "desc";

                const skip = (page - 1) * limit;

                const where = {
                    enterpriseId,
                    ...(type ? { type } : {}),
                    ...(search
                        ? {
                              OR: [
                                  { category: { contains: search } },
                                  { description: { contains: search } },
                              ],
                          }
                        : {}),
                };

                const validSortFields = financialTransactionAllowedSortFields;
                const safeSortBy = validSortFields.includes(sortBy) ? sortBy : "date";
                const safeSortOrder = sortOrder === "asc" ? "asc" : "desc";

                const [transactions, total] = await prisma.$transaction([
                    prisma.financialTransaction.findMany({
                        where,
                        include: {
                            receivable: {
                                include: { customer: { include: { person: true } } },
                            },
                            payable: {
                                include: { supplier: { include: { person: true } } },
                            },
                        },
                        skip,
                        take: limit,
                        orderBy: { [safeSortBy]: safeSortOrder },
                    }),
                    prisma.financialTransaction.count({ where }),
                ]);

                return {
                    items: transactions,
                    meta: {
                        total,
                        page,
                        totalPages: Math.ceil(total / limit),
                    },
                };
            },
            "FINANCIAL_TRANSACTION:getAll",
            enterpriseId
        );

    getById = async (id: number, enterpriseId: number) =>
        this.safeQuery(
            async () =>
                prisma.financialTransaction.findUnique({
                    where: { id, enterpriseId },
                    include: {
                        receivable: {
                            include: { customer: { include: { person: true } } },
                        },
                        payable: {
                            include: { supplier: { include: { person: true } } },
                        },
                    },
                }),
            "FINANCIAL_TRANSACTION:getById",
            enterpriseId
        );

    create = async (enterpriseId: number, data: FinancialTransactionInput, userId: number) =>
        this.safeQuery(
            async () => {
                if (data.value <= 0) {
                    throw new AppError(
                        "Valor deve ser maior que 0",
                        400,
                        "FINANCIAL_TRANSACTION:create:value"
                    );
                }

                const [receivable, payable] = await Promise.all([
                    prisma.accountsReceivable.findFirst({
                        where: { id: data.accountsReceivableId ?? 0, enterpriseId },
                        select: { id: true },
                    }),
                    prisma.accountsPayable.findFirst({
                        where: { id: data.accountsPayableId ?? 0, enterpriseId },
                        select: { id: true },
                    }),
                ]);

                if (data.accountsReceivableId && !receivable) {
                    throw new AppError(
                        "Conta a receber não encontrada",
                        404,
                        "FINANCIAL_TRANSACTION:create:FK"
                    );
                }

                if (data.accountsPayableId && !payable) {
                    throw new AppError(
                        "Conta a pagar não encontrada",
                        404,
                        "FINANCIAL_TRANSACTION:create:FK"
                    );
                }

                const created = await prisma.$transaction(async (tx) => {
                    const transaction = await tx.financialTransaction.create({
                        data: {
                            ...(env.ENVIRONMENT !== "PRODUCTION" && typeof data.id === "number"
                                ? { id: data.id }
                                : {}),
                            enterpriseId,
                            type: data.type,
                            value: new Decimal(data.value),
                            date: data.date ?? new Date(),
                            category: data.category ?? null,
                            description: data.description ?? null,
                            accountsReceivableId: data.accountsReceivableId ?? null,
                            accountsPayableId: data.accountsPayableId ?? null,
                            notes: data.notes ?? null,
                        },
                    });

                    await tx.audit.create({
                        data: {
                            userId,
                            enterpriseId,
                            action: `Created financial transaction ${transaction.id}`,
                            entity: "FinancialTransaction",
                        },
                    });

                    return transaction;
                });

                return created;
            },
            "FINANCIAL_TRANSACTION:create",
            enterpriseId
        );

    update = async (
        id: number,
        enterpriseId: number,
        data: FinancialTransactionInput,
        userId: number
    ) =>
        this.safeQuery(
            async () => {
                const existing = await prisma.financialTransaction.findFirst({
                    where: { id, enterpriseId },
                });

                if (!existing) {
                    throw new AppError(
                        "Lançamento financeiro não encontrado",
                        404,
                        "FINANCIAL_TRANSACTION:update"
                    );
                }

                if (data.value !== undefined && data.value <= 0) {
                    throw new AppError(
                        "Valor deve ser maior que 0",
                        400,
                        "FINANCIAL_TRANSACTION:update:value"
                    );
                }

                if (data.accountsReceivableId) {
                    const receivable = await prisma.accountsReceivable.findFirst({
                        where: { id: data.accountsReceivableId, enterpriseId },
                        select: { id: true },
                    });
                    if (!receivable) {
                        throw new AppError(
                            "Conta a receber não encontrada",
                            404,
                            "FINANCIAL_TRANSACTION:update:FK"
                        );
                    }
                }

                if (data.accountsPayableId) {
                    const payable = await prisma.accountsPayable.findFirst({
                        where: { id: data.accountsPayableId, enterpriseId },
                        select: { id: true },
                    });
                    if (!payable) {
                        throw new AppError(
                            "Conta a pagar não encontrada",
                            404,
                            "FINANCIAL_TRANSACTION:update:FK"
                        );
                    }
                }

                const updated = await prisma.$transaction(async (tx) => {
                    const transaction = await tx.financialTransaction.update({
                        where: { id },
                        data: {
                            type: data.type ?? existing.type,
                            value:
                                data.value !== undefined ? new Decimal(data.value) : existing.value,
                            date: data.date ?? existing.date,
                            category: data.category ?? existing.category,
                            description: data.description ?? existing.description,
                            accountsReceivableId:
                                data.accountsReceivableId ?? existing.accountsReceivableId,
                            accountsPayableId: data.accountsPayableId ?? existing.accountsPayableId,
                            notes: data.notes ?? existing.notes,
                            updatedAt: new Date(),
                        },
                    });

                    await tx.audit.create({
                        data: {
                            userId,
                            enterpriseId,
                            action: `Updated financial transaction ${transaction.id}`,
                            entity: "FinancialTransaction",
                        },
                    });

                    return transaction;
                });

                return updated;
            },
            "FINANCIAL_TRANSACTION:update",
            enterpriseId
        );
}
