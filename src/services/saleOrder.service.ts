import { prisma } from "@config/prisma";
import { env } from "@config/env";
import { BaseService } from "@services/base.service";
import { AppError } from "@utils/appError";
import { OrderStatus } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";

export interface SaleOrderInput {
    id?: number;
    customerId: number;
    code: string;
    status?: OrderStatus;
    totalValue: number;
    notes?: string | null;
}

export class SaleOrderService extends BaseService {
    getAll = async (enterpriseId: number, page = 1, limit = 10, status?: OrderStatus) =>
        this.safeQuery(
            async () => {
                const skip = (page - 1) * limit;

                const [orders, total] = await prisma.$transaction([
                    prisma.saleOrder.findMany({
                        where: { enterpriseId, ...(status && { status }) },
                        include: { customer: { include: { person: true } }, items: true },
                        skip,
                        take: limit,
                        orderBy: { createdAt: "desc" },
                    }),
                    prisma.saleOrder.count({ where: { enterpriseId, ...(status && { status }) } }),
                ]);

                return {
                    orders,
                    meta: {
                        total,
                        page,
                        totalPages: Math.ceil(total / limit),
                    },
                };
            },
            "SALE_ORDER:getAll",
            enterpriseId
        );

    getById = async (id: number, enterpriseId: number) =>
        this.safeQuery(
            async () =>
                prisma.saleOrder.findUnique({
                    where: { id, enterpriseId },
                    include: { customer: { include: { person: true } }, items: true },
                }),
            "SALE_ORDER:getById",
            enterpriseId
        );

    create = async (enterpriseId: number, data: SaleOrderInput, userId: number) =>
        this.safeQuery(
            async () => {
                const [codeTaken, customer] = await Promise.all([
                    prisma.saleOrder.findFirst({ where: { code: data.code } }),
                    prisma.customer.findFirst({
                        where: { id: data.customerId, enterpriseId },
                        select: { id: true },
                    }),
                ]);

                if (codeTaken) throw new AppError("Pedido já existe", 409, "SALE_ORDER:create");
                if (!customer) throw new AppError("Cliente não encontrado", 404, "FK:NOT_FOUND");

                const created = await prisma.$transaction(async (tx) => {
                    const order = await tx.saleOrder.create({
                        data: {
                            ...(env.ENVIRONMENT !== "PRODUCTION" && typeof data.id === "number"
                                ? { id: data.id }
                                : {}),
                            enterpriseId,
                            customerId: data.customerId,
                            code: data.code,
                            status: data.status ?? OrderStatus.PENDING,
                            totalValue: new Decimal(data.totalValue),
                            notes: data.notes ?? null,
                        },
                    });

                    await tx.audit.create({
                        data: {
                            userId,
                            enterpriseId,
                            action: `Created sale order ${order.code}`,
                            entity: "SaleOrder",
                        },
                    });

                    return order;
                });

                return created;
            },
            "SALE_ORDER:create",
            enterpriseId
        );

    update = async (id: number, enterpriseId: number, data: SaleOrderInput, userId: number) =>
        this.safeQuery(
            async () => {
                const existing = await prisma.saleOrder.findFirst({ where: { id, enterpriseId } });
                if (!existing)
                    throw new AppError("Pedido não encontrado", 404, "SALE_ORDER:update");

                if (data.code && data.code !== existing.code) {
                    const codeTaken = await prisma.saleOrder.findFirst({
                        where: { code: data.code },
                    });
                    if (codeTaken)
                        throw new AppError("Pedido já existe", 409, "SALE_ORDER:update:code");
                }

                if (data.customerId) {
                    const customer = await prisma.customer.findFirst({
                        where: { id: data.customerId, enterpriseId },
                        select: { id: true },
                    });
                    if (!customer)
                        throw new AppError("Cliente não encontrado", 404, "FK:NOT_FOUND");
                }

                const updated = await prisma.$transaction(async (tx) => {
                    const order = await tx.saleOrder.update({
                        where: { id },
                        data: {
                            customerId: data.customerId ?? existing.customerId,
                            code: data.code ?? existing.code,
                            status: data.status ?? existing.status,
                            totalValue:
                                data.totalValue !== undefined
                                    ? new Decimal(data.totalValue)
                                    : existing.totalValue,
                            notes: data.notes ?? existing.notes,
                            updatedAt: new Date(),
                        },
                    });

                    await tx.audit.create({
                        data: {
                            userId,
                            enterpriseId,
                            action: `Updated sale order ${order.code}`,
                            entity: "SaleOrder",
                        },
                    });

                    return order;
                });

                return updated;
            },
            "SALE_ORDER:update",
            enterpriseId
        );
}
