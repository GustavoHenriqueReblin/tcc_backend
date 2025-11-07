import { prisma } from "@config/prisma";
import { BaseService } from "@services/base.service";
import { Status, PersonType } from "@prisma/client";
import { AppError } from "@utils/appError";

export interface SupplierInput {
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
    type?: PersonType;
    contactName?: string;
    contactPhone?: string;
    contactEmail?: string;
    website?: string;
    paymentTerms?: string;
    deliveryTime?: string;
    category?: string;
    notes?: string;
    status?: Status;
}

export class SupplierService extends BaseService {
    getAll = async (enterpriseId: number, page = 1, limit = 10, includeInactive: boolean) =>
        this.safeQuery(async () => {
            const skip = (page - 1) * limit;

            const [suppliers, total] = await prisma.$transaction([
                prisma.supplier.findMany({
                    where: {
                        enterpriseId,
                        ...(includeInactive ? {} : { status: Status.ACTIVE }),
                    },
                    include: { person: true },
                    skip,
                    take: limit,
                    orderBy: { createdAt: "desc" },
                }),
                prisma.supplier.count({
                    where: {
                        enterpriseId,
                        ...(includeInactive ? {} : { status: Status.ACTIVE }),
                    },
                }),
            ]);

            return {
                suppliers,
                meta: {
                    total,
                    page,
                    totalPages: Math.ceil(total / limit),
                },
            };
        }, "SUPPLIER:getAll");

    getById = async (id: number, enterpriseId: number) =>
        this.safeQuery(async () => {
            return prisma.supplier.findUnique({
                where: { id, enterpriseId } as unknown as { id: number },
                include: { person: true },
            });
        }, "SUPPLIER:getById");

    create = async (enterpriseId: number, data: SupplierInput, userId: number) =>
        this.safeQuery(async () => {
            const result = await prisma.$transaction(async (tx) => {
                const existingPerson = await tx.person.findFirst({
                    where: { taxId: data.person.taxId, enterpriseId },
                });

                if (!existingPerson) {
                    const newPerson = await tx.person.create({
                        data: { ...data.person, enterpriseId },
                    });

                    const newSupplier = await tx.supplier.create({
                        data: {
                            enterpriseId,
                            personId: newPerson.id,
                            type: data.type ?? PersonType.BUSINESS,
                            contactName: data.contactName,
                            contactPhone: data.contactPhone,
                            contactEmail: data.contactEmail,
                            website: data.website,
                            paymentTerms: data.paymentTerms,
                            deliveryTime: data.deliveryTime,
                            category: data.category,
                            notes: data.notes,
                            status: data.status ?? Status.ACTIVE,
                        },
                        include: { person: true },
                    });

                    await tx.audit.create({
                        data: {
                            userId,
                            enterpriseId,
                            action: `Created supplier ${newPerson.name} (${newPerson.taxId})`,
                            entity: "Supplier",
                        },
                    });

                    return newSupplier;
                }

                const existingSupplier = await tx.supplier.findFirst({
                    where: { personId: existingPerson.id, enterpriseId },
                });

                if (existingSupplier) {
                    throw new AppError(
                        `CPF/CNPJ ${data.person.taxId} já está vinculado a outro fornecedor`,
                        409,
                        "SUPPLIER:create"
                    );
                }

                const updatedPerson = await tx.person.update({
                    where: { id: existingPerson.id },
                    data: { ...data.person, updatedAt: new Date() },
                });

                const linkedSupplier = await tx.supplier.create({
                    data: {
                        enterpriseId,
                        personId: updatedPerson.id,
                        type: data.type ?? PersonType.BUSINESS,
                        contactName: data.contactName,
                        contactPhone: data.contactPhone,
                        contactEmail: data.contactEmail,
                        website: data.website,
                        paymentTerms: data.paymentTerms,
                        deliveryTime: data.deliveryTime,
                        category: data.category,
                        notes: data.notes,
                        status: data.status ?? Status.ACTIVE,
                    },
                    include: { person: true },
                });

                await tx.audit.create({
                    data: {
                        userId,
                        enterpriseId,
                        action: `Linked existing person ${updatedPerson.name} (${updatedPerson.taxId}) as supplier`,
                        entity: "Supplier",
                    },
                });

                return linkedSupplier;
            });

            return result;
        }, "SUPPLIER:create");

    update = async (id: number, enterpriseId: number, data: SupplierInput, userId: number) =>
        this.safeQuery(async () => {
            const existing = await prisma.supplier.findFirst({
                where: { id, enterpriseId },
                include: { person: true },
            });

            if (!existing) throw new AppError("Fornecedor não encontrado", 404, "SUPPLIER:update");

            const [updatedPerson, updatedSupplier] = await prisma.$transaction([
                prisma.person.update({
                    where: { id: existing.personId },
                    data: {
                        ...data.person,
                        updatedAt: new Date(),
                    },
                }),

                prisma.supplier.update({
                    where: { id },
                    data: {
                        contactName: data.contactName,
                        contactPhone: data.contactPhone,
                        contactEmail: data.contactEmail,
                        website: data.website,
                        paymentTerms: data.paymentTerms,
                        deliveryTime: data.deliveryTime,
                        category: data.category,
                        notes: data.notes,
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
                    action: `Updated supplier ${updatedPerson.name} (${updatedPerson.taxId})`,
                    entity: "Supplier",
                },
            });

            return updatedSupplier;
        }, "SUPPLIER:update");
}
