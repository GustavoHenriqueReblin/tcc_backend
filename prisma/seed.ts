import { prisma } from "../src/config/prisma";
import { Role, Plan, Product, Status, MaritalStatus, CustomerType } from "@prisma/client";
import { insertGeoData } from "../src/cron/updateGeoData";
import bcrypt from "bcrypt";
import { env } from "../src/config/env";

const main = async () => {
    if (env.ENVIRONMENT === "DEVELOPMENT") console.log("Inserindo dados iniciais...");

    const country = await prisma.country.upsert({
        where: { isoCode: "BRA" },
        update: {},
        create: {
            name: "Brazil",
            isoCode: "BRA",
        },
    });

    const state = await prisma.state.upsert({
        where: { ibgeCode: 42 },
        update: {},
        create: {
            name: "Santa Catarina",
            uf: "SC",
            ibgeCode: 42,
            countryId: country.id,
        },
    });

    const city = await prisma.city.upsert({
        where: { ibgeCode: 4217202 },
        update: {},
        create: {
            name: "São Miguel do Oeste",
            ibgeCode: 4217202,
            stateId: state.id,
        },
    });

    const enterprise = await prisma.enterprise.upsert({
        where: { 
            taxId_countryId_stateId_cityId: {
                cityId: city.id,
                countryId: country.id,
                stateId: state.id,
                taxId: "123.456.78/0001-00",
            } 
        },
        update: {},
        create: {
            countryId: country.id,
            stateId: state.id,
            cityId: city.id,
            name: "TCC Juice Factory",
            legalName: "TCC Juice Factory LTDA",
            taxId: "123.456.78/0001-00",
            responsiblePerson: "Gustavo Hique",
            email: "contact@tccjuice.com",
            phone: "+55 (49) 99999-9999",
            street: "Rua das Laranjeiras",
            number: "100",
            neighborhood: "Centro",
            postalCode: "89900-000",
            plan: Plan.START,
            product: Product.INDUSTRY,
            status: Status.ACTIVE,
        },
    });

    const person = await prisma.person.upsert({
        where: {
            enterpriseId_taxId: {
                enterpriseId: enterprise.id,
                taxId: "123.456.789-00",
            },
        },
        update: {},
        create: {
            enterpriseId: enterprise.id,
            countryId: country.id,
            stateId: state.id,
            cityId: city.id,
            name: "Gustavo Hique",
            legalName: "Gustavo Hique",
            taxId: "123.456.789-00",
            nationalId: "1122334455",
            maritalStatus: MaritalStatus.SINGLE,
            email: "gustavo@example.com",
            phone: "+55 (49) 99999-9999",
            neighborhood: "Centro",
            street: "Rua das Laranjeiras",
            number: "100",
            postalCode: "89900000",
        },
    });

    await prisma.user.upsert({
        where: { username: "gustavo" },
        update: {},
        create: {
            enterpriseId: enterprise.id,
            personId: person.id,
            username: "gustavo",
            password: await bcrypt.hash(env.APP_SECRET + "123456", 10),
            role: Role.OWNER,
            status: Status.ACTIVE,
        },
    });

    const customerPerson = await prisma.person.upsert({
        where: {
            enterpriseId_taxId: {
                enterpriseId: enterprise.id,
                taxId: "987.654.321-00",
            },
        },
        update: {},
        create: {
            enterpriseId: enterprise.id,
            countryId: country.id,
            stateId: state.id,
            cityId: city.id,
            name: "Cliente Padrão",
            legalName: "Mercado São João",
            taxId: "987.654.321-00",
            nationalId: "5566778899",
            email: "cliente@mercadosaojoao.com",
            phone: "+55 (49) 98888-8888",
            street: "Rua Principal",
            number: "200",
            neighborhood: "Centro",
            postalCode: "89900-111",
        },
    });

    const customer = await prisma.customer.upsert({
        where: { personId: customerPerson.id },
        update: {},
        create: {
            enterpriseId: enterprise.id,
            personId: customerPerson.id,
            type: CustomerType.BUSINESS,
            contactName: "João da Silva",
            contactPhone: "+55 (49) 98888-8888",
            contactEmail: "joao@mercadosaojoao.com",
            status: Status.ACTIVE,
        },
    });

    await prisma.deliveryAddress.createMany({
        data: [
            {
                customerId: customer.id,
                enterpriseId: enterprise.id,
                label: "Matriz - Centro",
                street: "Rua Principal",
                number: "200",
                neighborhood: "Centro",
                postalCode: "89900-111",
                cityId: city.id,
                stateId: state.id,
                countryId: country.id,
                isDefault: true,
                status: Status.ACTIVE,
            },
            {
                customerId: customer.id,
                enterpriseId: enterprise.id,
                label: "Filial - Bairro Industrial",
                street: "Rua das Indústrias",
                number: "500",
                neighborhood: "Bairro Industrial",
                postalCode: "89900-222",
                cityId: city.id,
                stateId: state.id,
                countryId: country.id,
                isDefault: false,
                status: Status.ACTIVE,
            },
            {
                customerId: customer.id,
                enterpriseId: enterprise.id,
                label: "Depósito - Zona Norte",
                street: "Av. Norte",
                number: "1500",
                neighborhood: "Zona Norte",
                postalCode: "89900-333",
                cityId: city.id,
                stateId: state.id,
                countryId: country.id,
                isDefault: false,
                status: Status.INACTIVE,
            },
        ],
        skipDuplicates: true,
    });

    await insertGeoData();

    if (env.ENVIRONMENT === "DEVELOPMENT") console.log("Seed finalizada com sucesso!");
};

main()
    .catch((e) => {
        if (env.ENVIRONMENT === "DEVELOPMENT") console.error("Erro ao executar seed:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
