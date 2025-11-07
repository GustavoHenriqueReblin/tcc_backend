import { prisma } from "@config/prisma";
import { BaseService } from "@services/base.service";
import { Status } from "@prisma/client";
import { AppError } from "@utils/appError";

export interface DeliveryAddressInput {
    customerId: number;
    label?: string;
    street?: string;
    number?: string;
    neighborhood?: string;
    complement?: string;
    reference?: string;
    postalCode?: string;
    cityId: number;
    stateId: number;
    countryId?: number;
    isDefault?: boolean;
    status?: Status;
}

export class DeliveryAddressService extends BaseService {
    getAll = async (enterpriseId: number, customerId: number) =>
        this.safeQuery(
            async () => {
                const addresses = await prisma.deliveryAddress.findMany({
                    where: { enterpriseId, customerId },
                    include: {
                        city: true,
                        state: true,
                        country: true,
                    },
                    orderBy: { createdAt: "desc" },
                });

                return addresses;
            },
            "DELIVERY:getAll",
            enterpriseId
        );

    getById = async (id: number, enterpriseId: number) =>
        this.safeQuery(
            async () => {
                const address = await prisma.deliveryAddress.findUnique({
                    where: { id, enterpriseId },
                    include: { city: true, state: true, country: true },
                });

                if (!address) throw new AppError("Endereço de entrega não encontrado", 404);
                return address;
            },
            "DELIVERY:getById",
            enterpriseId
        );

    create = async (enterpriseId: number, data: DeliveryAddressInput, userId: number) =>
        this.safeQuery(
            async () => {
                const customer = await prisma.customer.findFirst({
                    where: { id: data.customerId, enterpriseId },
                });
                if (!customer) throw new AppError("Cliente não encontrado", 404);

                if (data.isDefault) {
                    await prisma.deliveryAddress.updateMany({
                        where: { enterpriseId, customerId: data.customerId },
                        data: { isDefault: false },
                    });
                }

                const address = await prisma.$transaction(async (tx) => {
                    const newAddress = await tx.deliveryAddress.create({
                        data: {
                            ...data,
                            enterpriseId,
                            isDefault: data.isDefault ?? false,
                            status: data.status ?? Status.ACTIVE,
                        },
                        include: { city: true, state: true, country: true },
                    });

                    await tx.audit.create({
                        data: {
                            userId,
                            enterpriseId,
                            action: `Created delivery address "${newAddress.label ?? "Sem nome"}"`,
                            entity: "DeliveryAddress",
                        },
                    });

                    return newAddress;
                });

                return address;
            },
            "DELIVERY:create",
            enterpriseId
        );

    update = async (id: number, enterpriseId: number, data: DeliveryAddressInput, userId: number) =>
        this.safeQuery(
            async () => {
                const existing = await prisma.deliveryAddress.findFirst({
                    where: { id, enterpriseId },
                });
                if (!existing) throw new AppError("Endereço de entrega não encontrado", 404);

                if (data.isDefault) {
                    await prisma.deliveryAddress.updateMany({
                        where: {
                            enterpriseId,
                            customerId: existing.customerId,
                            NOT: { id },
                        },
                        data: { isDefault: false },
                    });
                }

                const updated = await prisma.$transaction(async (tx) => {
                    const addr = await tx.deliveryAddress.update({
                        where: { id },
                        data: {
                            ...data,
                            isDefault: data.isDefault ?? existing.isDefault,
                            status: data.status ?? existing.status,
                            updatedAt: new Date(),
                        },
                        include: { city: true, state: true, country: true },
                    });

                    await tx.audit.create({
                        data: {
                            userId,
                            enterpriseId,
                            action: `Updated delivery address "${addr.label ?? "Sem nome"}"`,
                            entity: "DeliveryAddress",
                        },
                    });

                    return addr;
                });

                return updated;
            },
            "DELIVERY:update",
            enterpriseId
        );
}
