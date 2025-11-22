import { prisma } from "@config/prisma";
import { env } from "@config/env";
import { BaseService } from "@services/base.service";
import { Status, PersonType, MaritalStatus } from "@prisma/client";
import { AppError } from "@utils/appError";
import {
    customerAllowedSortFields,
    customerPersonAllowedSortFields,
} from "@routes/customer.routes";

export interface CustomerInput {
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
    status?: Status;
}

export class CustomerService extends BaseService {
    getAll = async (
        enterpriseId: number,
        page: number,
        limit: number,
        includeInactive: boolean,
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
                    ...(includeInactive ? {} : { status: Status.ACTIVE }),
                    ...(search
                        ? {
                              OR: [
                                  { person: { name: { contains: search } } },
                                  {
                                      person: {
                                          legalName: { contains: search },
                                      },
                                  },
                                  { person: { taxId: { contains: search } } },
                              ],
                          }
                        : {}),
                };

                const validSortFields =
                    customerPersonAllowedSortFields.concat(customerAllowedSortFields);
                const safeSortBy = validSortFields.includes(sortBy) ? sortBy : "createdAt";
                const safeSortOrder = sortOrder === "asc" ? "asc" : "desc";

                const orderBy = customerPersonAllowedSortFields.includes(safeSortBy)
                    ? { person: { [safeSortBy]: safeSortOrder } }
                    : { [safeSortBy]: safeSortOrder };

                const [customers, total] = await prisma.$transaction([
                    prisma.customer.findMany({
                        where,
                        skip,
                        take: limit,
                        orderBy,
                        include: {
                            person: { include: { city: true, state: true, country: true } },
                            deliveryAddress: true,
                        },
                    }),
                    prisma.customer.count({ where }),
                ]);

                return {
                    customers,
                    meta: {
                        total,
                        page,
                        totalPages: Math.ceil(total / limit),
                    },
                };
            },
            "CUSTOMER:getAll",
            enterpriseId
        );

    getById = async (id: number, enterpriseId: number) =>
        this.safeQuery(
            async () => {
                return prisma.customer.findUnique({
                    where: { id, enterpriseId },
                    include: { person: true, deliveryAddress: true },
                });
            },
            "CUSTOMER:getById",
            enterpriseId
        );

    create = async (enterpriseId: number, data: CustomerInput, userId: number) =>
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

                        const newCustomer = await tx.customer.create({
                            data: {
                                ...(env.ENVIRONMENT !== "PRODUCTION" && typeof data.id === "number"
                                    ? { id: data.id }
                                    : {}),
                                enterpriseId,
                                personId: newPerson.id,
                                type: data.type ?? PersonType.INDIVIDUAL,
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
                            type: data.type ?? PersonType.INDIVIDUAL,
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
            },
            "CUSTOMER:create",
            enterpriseId
        );

    update = async (id: number, enterpriseId: number, data: CustomerInput, userId: number) =>
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
                            `CPF/CNPJ ${data.person.taxId} já está vinculado a outro cliente`,
                            409,
                            "CUSTOMER:create"
                        );
                }

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
                            dateOfBirth:
                                data.person && data.person.dateOfBirth
                                    ? new Date(data.person.dateOfBirth)
                                    : undefined,
                            updatedAt: new Date(),
                        },
                    }),

                    prisma.customer.update({
                        where: { id },
                        data: {
                            contactName: data.contactName,
                            contactPhone: data.contactPhone,
                            contactEmail: data.contactEmail,
                            status: data.status,
                            updatedAt: new Date(),
                            ...(data.type && { type: data.type }),
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
            },
            "CUSTOMER:update",
            enterpriseId
        );
}
