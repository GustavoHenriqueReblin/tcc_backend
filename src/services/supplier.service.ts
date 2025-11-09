import { prisma } from "@config/prisma";
import { env } from "@config/env";
import { BaseService } from "@services/base.service";
import { Status, PersonType, MaritalStatus } from "@prisma/client";
import { AppError } from "@utils/appError";

export interface SupplierInput {
    id?: number;
    person: {
        id?: number;
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
        maritalStatus?: MaritalStatus;
        complement?: string;
        notes?: string;
        cellphone?: string;
        dateOfBirth?: Date;
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
        this.safeQuery(
            async () => {
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
            },
            "SUPPLIER:getAll",
            enterpriseId
        );

    getById = async (id: number, enterpriseId: number) =>
        this.safeQuery(
            async () => {
                return prisma.supplier.findUnique({
                    where: { id, enterpriseId } as unknown as { id: number },
                    include: { person: true },
                });
            },
            "SUPPLIER:getById",
            enterpriseId
        );

    create = async (enterpriseId: number, data: SupplierInput, userId: number) =>
        this.safeQuery(
            async () => {
                if (data.person) {
                    const { cityId, stateId, countryId } = data.person;

                    const [city, state, country] = await Promise.all([
                        prisma.city.findFirst({
                            where: { id: cityId ?? 0 },
                            select: {
                                id: true,
                                stateId: true,
                                state: { select: { countryId: true } },
                            },
                        }),
                        prisma.state.findFirst({
                            where: { id: stateId ?? 0 },
                            select: { id: true },
                        }),
                        prisma.country.findFirst({
                            where: { id: countryId ?? 0 },
                            select: { id: true },
                        }),
                    ]);

                    if (cityId && !city)
                        throw new AppError("Cidade não encontrada", 404, "FK:NOT_FOUND");
                    if (stateId && !state)
                        throw new AppError("Estado não encontrado", 404, "FK:NOT_FOUND");
                    if (countryId && !country)
                        throw new AppError("País não encontrado", 404, "FK:NOT_FOUND");

                    if (city && stateId && city.stateId !== stateId) {
                        throw new AppError(
                            "Cidade não pertence ao estado informado",
                            400,
                            "FK:MISMATCH"
                        );
                    }

                    if (city && countryId && city.state.countryId !== countryId) {
                        throw new AppError(
                            "Cidade não pertence ao país informado",
                            400,
                            "FK:MISMATCH"
                        );
                    }
                }

                const result = await prisma.$transaction(async (tx) => {
                    const existingPerson = await tx.person.findFirst({
                        where: { taxId: data.person.taxId, enterpriseId },
                    });

                    if (!existingPerson) {
                        const newPerson = await tx.person.create({
                            data: {
                                ...(env.ENVIRONMENT !== "PRODUCTION" &&
                                typeof data.person.id === "number"
                                    ? { id: data.person.id }
                                    : {}),
                                enterpriseId,
                                name: data.person.name,
                                legalName: data.person.legalName,
                                taxId: data.person.taxId,
                                nationalId: data.person.nationalId,
                                email: data.person.email,
                                phone: data.person.phone,
                                neighborhood: data.person.neighborhood,
                                street: data.person.street,
                                number: data.person.number,
                                postalCode: data.person.postalCode,
                                cityId: data.person.cityId,
                                stateId: data.person.stateId,
                                countryId: data.person.countryId,
                                maritalStatus: data.person.maritalStatus,
                                complement: data.person.complement,
                                notes: data.person.notes,
                                cellphone: data.person.cellphone,
                                dateOfBirth:
                                    data.person && data.person.dateOfBirth
                                        ? new Date(data.person.dateOfBirth)
                                        : undefined,
                            },
                        });

                        const newSupplier = await tx.supplier.create({
                            data: {
                                ...(env.ENVIRONMENT !== "PRODUCTION" && typeof data.id === "number"
                                    ? { id: data.id }
                                    : {}),
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
            },
            "SUPPLIER:create",
            enterpriseId
        );

    update = async (id: number, enterpriseId: number, data: SupplierInput, userId: number) =>
        this.safeQuery(
            async () => {
                if (data.person) {
                    const { cityId, stateId, countryId, taxId } = data.person;

                    const [city, state, country] = await Promise.all([
                        prisma.city.findFirst({
                            where: { id: cityId ?? 0 },
                            select: {
                                id: true,
                                stateId: true,
                                state: { select: { countryId: true } },
                            },
                        }),
                        prisma.state.findFirst({
                            where: { id: stateId ?? 0 },
                            select: { id: true },
                        }),
                        prisma.country.findFirst({
                            where: { id: countryId ?? 0 },
                            select: { id: true },
                        }),
                    ]);

                    if (cityId && !city)
                        throw new AppError("Cidade não encontrada", 404, "FK:NOT_FOUND");
                    if (stateId && !state)
                        throw new AppError("Estado não encontrado", 404, "FK:NOT_FOUND");
                    if (countryId && !country)
                        throw new AppError("País não encontrado", 404, "FK:NOT_FOUND");

                    if (city && stateId && city.stateId !== stateId) {
                        throw new AppError(
                            "Cidade não pertence ao estado informado",
                            400,
                            "FK:MISMATCH"
                        );
                    }

                    if (city && countryId && city.state.countryId !== countryId) {
                        throw new AppError(
                            "Cidade não pertence ao país informado",
                            400,
                            "FK:MISMATCH"
                        );
                    }

                    const duplicate = await prisma.customer.findFirst({
                        where: {
                            enterpriseId,
                            person: {
                                taxId: taxId,
                            },
                        },
                        include: {
                            person: true,
                        },
                    });

                    if (duplicate && duplicate.id !== id)
                        throw new AppError(
                            `CPF/CNPJ ${data.person.taxId} já está vinculado a outro fornecedor`,
                            409,
                            "CUSTOMER:create"
                        );
                }

                const existing = await prisma.supplier.findFirst({
                    where: { id, enterpriseId },
                    include: { person: true },
                });

                if (!existing)
                    throw new AppError("Fornecedor não encontrado", 404, "SUPPLIER:update");

                const [updatedPerson, updatedSupplier] = await prisma.$transaction([
                    prisma.person.update({
                        where: { id: existing.personId },
                        data: {
                            ...data.person,
                            dateOfBirth:
                                data.person && data.person.dateOfBirth
                                    ? new Date(data.person.dateOfBirth)
                                    : undefined,
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
            },
            "SUPPLIER:update",
            enterpriseId
        );
}
