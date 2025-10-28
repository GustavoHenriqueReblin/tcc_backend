import { prisma } from "@config/prisma";
import { BaseService } from "@services/base.service";
import { Status, CustomerType } from "@prisma/client";
import { AppError } from "@utils/appError";

export interface CustomerInput {
    person: {
        name: string;
        legalName?: string;
        taxId: string;
        nationalId?: string;
        email?: string;
        phone?: string;
        neighborhood?: string;
        street?: string;
        number?: string;
        postalCode?: string;
        cityId?: number;
        stateId?: number;
        countryId?: number;
    };
    type?: CustomerType;
    contactName?: string;
    contactPhone?: string;
    contactEmail?: string;
    status?: Status;
}

export class CustomerService extends BaseService {
    getAll = async (enterpriseId: number, page = 1, limit = 10, includeInactive: boolean) =>
        this.safeQuery(async () => {
            const skip = (page - 1) * limit;

            const [customers, total] = await prisma.$transaction([
                prisma.customer.findMany({
                    where: {
                        enterpriseId,
                        ...(includeInactive ? {} : { status: Status.ACTIVE }),
                    },
                    include: { person: true, deliveryAddress: true },
                    skip,
                    take: limit,
                    orderBy: { createdAt: "desc" },
                }),
                prisma.customer.count({
                    where: {
                        enterpriseId,
                        ...(includeInactive ? {} : { status: Status.ACTIVE }),
                    },
                }),
            ]);

            return {
                customers,
                meta: {
                    total,
                    page,
                    totalPages: Math.ceil(total / limit),
                },
            };
        }, "CUSTOMER:getAll");

    getById = async (id: number, enterpriseId: number) =>
        this.safeQuery(async () => {
            return prisma.customer.findUnique({
                where: { id, enterpriseId },
                include: { person: true, deliveryAddress: true },
            });
        }, "CUSTOMER:getById");

    create = async (enterpriseId: number, data: CustomerInput, userId: number) =>
        this.safeQuery(async () => {
            const result = await prisma.$transaction(async (tx) => {
                const existingPerson = await tx.person.findFirst({
                    where: { taxId: data.person.taxId, enterpriseId },
                });

                if (!existingPerson) {
                    const newPerson = await tx.person.create({
                        data: { ...data.person, enterpriseId },
                    });

                    const newCustomer = await tx.customer.create({
                        data: {
                            enterpriseId,
                            personId: newPerson.id,
                            type: data.type ?? CustomerType.INDIVIDUAL,
                            contactName: data.contactName,
                            contactPhone: data.contactPhone,
                            contactEmail: data.contactEmail,
                            status: data.status ?? Status.ACTIVE,
                        },
                        include: { person: true },
                    });

                    await tx.audit.create({
                        data: {
                            userId,
                            enterpriseId,
                            action: `Created customer ${newPerson.name} (${newPerson.taxId})`,
                            entity: "Customer",
                        },
                    });

                    return newCustomer;
                }

                const existingCustomer = await tx.customer.findFirst({
                    where: { personId: existingPerson.id, enterpriseId },
                });

                if (existingCustomer) {
                    throw new AppError(
                        `CPF/CNPJ ${data.person.taxId} já está vinculado a outro cliente`,
                        409,
                        "CUSTOMER:create"
                    );
                }

                const updatedPerson = await tx.person.update({
                    where: { id: existingPerson.id },
                    data: { ...data.person, updatedAt: new Date() },
                });

                const linkedCustomer = await tx.customer.create({
                    data: {
                        enterpriseId,
                        personId: updatedPerson.id,
                        type: data.type ?? CustomerType.INDIVIDUAL,
                        contactName: data.contactName,
                        contactPhone: data.contactPhone,
                        contactEmail: data.contactEmail,
                        status: data.status ?? Status.ACTIVE,
                    },
                    include: { person: true },
                });

                await tx.audit.create({
                    data: {
                        userId,
                        enterpriseId,
                        action: `Linked existing person ${updatedPerson.name} (${updatedPerson.taxId}) as customer`,
                        entity: "Customer",
                    },
                });

                return linkedCustomer;
            });

            return result;
        }, "CUSTOMER:create");

    update = async (id: number, enterpriseId: number, data: CustomerInput, userId: number) =>
        this.safeQuery(async () => {
            const existing = await prisma.customer.findFirst({
                where: { id, enterpriseId },
                include: { person: true },
            });

            if (!existing) throw new AppError("Cliente não encontrado", 404, "CUSTOMER:update");

            const [updatedPerson, updatedCustomer] = await prisma.$transaction([
                prisma.person.update({
                    where: { id: existing.personId },
                    data: {
                        ...data.person,
                        updatedAt: new Date(),
                    },
                }),

                prisma.customer.update({
                    where: { id },
                    data: {
                        contactName: data.contactName,
                        contactPhone: data.contactPhone,
                        contactEmail: data.contactEmail,
                        type: data.type,
                        status: data.status,
                        updatedAt: new Date(),
                    },
                    include: { person: true },
                }),
            ]);

            await prisma.audit.create({
                data: {
                    userId,
                    enterpriseId,
                    action: `Updated customer ${updatedPerson.name} (${updatedPerson.taxId})`,
                    entity: "Customer",
                },
            });

            return updatedCustomer;
        }, "CUSTOMER:update");
}
