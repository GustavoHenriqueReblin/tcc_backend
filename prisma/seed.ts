import bcrypt from "bcrypt";
import { prisma } from "../src/config/prisma";
import { Role, Plan, Product, Status, MaritalStatus, CustomerType } from "@prisma/client";
import { insertGeoData } from "../src/cron/updateGeoData";
import { env } from "../src/config/env";
import { defaultUser } from "../src/config/default.data";

const idEnterpriseAdmin = 1;

export const clearData = async () => {
    await prisma.audit.deleteMany({
        where: { enterpriseId: idEnterpriseAdmin },
    });
    await prisma.deliveryAddress.deleteMany({
        where: { enterpriseId: idEnterpriseAdmin },
    });
    await prisma.customer.deleteMany({
        where: { enterpriseId: idEnterpriseAdmin },
    });
    await prisma.token.deleteMany({
        where: { enterpriseId: idEnterpriseAdmin },
    });
    await prisma.user.deleteMany({
        where: { enterpriseId: idEnterpriseAdmin },
    });
    await prisma.person.deleteMany({
        where: { enterpriseId: idEnterpriseAdmin },
    });
};

export const generateData = async () => {
    if (env.ENVIRONMENT === "DEVELOPMENT") console.log("Inserindo dados iniciais...");

    // País
    const country = await prisma.country.upsert({
        where: { isoCode: "BRA" },
        update: {},
        create: { name: "Brazil", isoCode: "BRA" },
    });

    // Estado
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

    // Cidade
    const city = await prisma.city.upsert({
        where: { ibgeCode: 4217202 },
        update: {},
        create: {
            name: "São Miguel do Oeste",
            ibgeCode: 4217202,
            stateId: state.id,
        },
    });

    // Empresa
    const enterpriseData = {
        id: idEnterpriseAdmin,
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
    };

    const enterprise = await prisma.enterprise.upsert({
        where: {
            taxId_countryId_stateId_cityId: {
                cityId: city.id,
                countryId: country.id,
                stateId: state.id,
                taxId: enterpriseData.taxId,
            },
        },
        update: enterpriseData,
        create: enterpriseData,
    });

    // Pessoa (usuário)
    const userPersonData = {
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
    };

    const userPerson = await prisma.person.upsert({
        where: {
            enterpriseId_taxId: {
                enterpriseId: enterprise.id,
                taxId: userPersonData.taxId,
            },
        },
        update: userPersonData,
        create: userPersonData,
    });

    // Usuário
    const userData = {
        enterpriseId: enterprise.id,
        personId: userPerson.id,
        username: defaultUser.username,
        password: await bcrypt.hash(env.APP_SECRET + defaultUser.password, 10),
        role: Role.OWNER,
        status: Status.ACTIVE,
    };

    await prisma.user.upsert({
        where: { username: userData.username },
        update: userData,
        create: userData,
    });

    // Clientes padrão
    const customersData = [
        {
            person: {
                name: "Mercado São João",
                legalName: "Mercado São João LTDA",
                taxId: "987.654.321-00",
                nationalId: "5566778899",
                email: "cliente@mercadosaojoao.com",
                phone: "+55 (49) 98888-8888",
                street: "Rua Principal",
                number: "200",
                neighborhood: "Centro",
                postalCode: "89900-111",
            },
            contact: {
                name: "João da Silva",
                phone: "+55 (49) 98888-8888",
                email: "joao@mercadosaojoao.com",
            },
            status: Status.ACTIVE,
        },
        {
            person: {
                name: "Fruteira Bom Preço",
                legalName: "Fruteira Bom Preço LTDA",
                taxId: "111.222.333-44",
                nationalId: "9988776655",
                email: "contato@fruteirabompreco.com",
                phone: "+55 (49) 97777-7777",
                street: "Av. das Palmeiras",
                number: "150",
                neighborhood: "Jardim América",
                postalCode: "89900-222",
            },
            contact: {
                name: "Maria Oliveira",
                phone: "+55 (49) 97777-7777",
                email: "maria@fruteirabompreco.com",
            },
            status: Status.ACTIVE,
        },
        {
            person: {
                name: "Supermercado União",
                legalName: "Supermercado União LTDA",
                taxId: "555.666.777-88",
                nationalId: "4433221100",
                email: "contato@superuniaosc.com",
                phone: "+55 (49) 96666-6666",
                street: "Rua das Indústrias",
                number: "890",
                neighborhood: "Zona Norte",
                postalCode: "89900-333",
            },
            contact: {
                name: "Carlos Pereira",
                phone: "+55 (49) 96666-6666",
                email: "carlos@superuniaosc.com",
            },
            status: Status.INACTIVE,
        },
    ];

    for (const customerData of customersData) {
        // Pessoa (cliente)
        const personData = {
            enterpriseId: enterprise.id,
            countryId: country.id,
            stateId: state.id,
            cityId: city.id,
            ...customerData.person,
        };

        const person = await prisma.person.upsert({
            where: {
                enterpriseId_taxId: {
                    enterpriseId: enterprise.id,
                    taxId: customerData.person.taxId,
                },
            },
            update: personData,
            create: personData,
        });

        // Cliente
        const customer = await prisma.customer.upsert({
            where: { personId: person.id },
            update: {
                contactName: customerData.contact.name,
                contactEmail: customerData.contact.email,
                contactPhone: customerData.contact.phone,
                status: customerData.status,
            },
            create: {
                enterpriseId: enterprise.id,
                personId: person.id,
                type: CustomerType.BUSINESS,
                contactName: customerData.contact.name,
                contactEmail: customerData.contact.email,
                contactPhone: customerData.contact.phone,
                status: customerData.status,
            },
        });

        // Endereços de entrega
        const deliveryAddresses = [
            {
                label: `${personData.name} - Matriz`,
                street: personData.street,
                number: personData.number,
                neighborhood: personData.neighborhood,
                postalCode: personData.postalCode,
                isDefault: true,
                status: Status.ACTIVE,
            },
            {
                label: `${personData.name} - Filial 1`,
                street: "Rua Secundária",
                number: "300",
                neighborhood: "Bairro Industrial",
                postalCode: "89900-444",
                isDefault: false,
                status: Status.ACTIVE,
            },
            {
                label: `${personData.name} - Depósito`,
                street: "Av. das Laranjeiras",
                number: "900",
                neighborhood: "Zona Norte",
                postalCode: "89900-555",
                isDefault: false,
                status: Status.INACTIVE,
            },
        ].map((addr) => ({
            ...addr,
            customerId: customer.id,
            enterpriseId: enterprise.id,
            cityId: city.id,
            stateId: state.id,
            countryId: country.id,
        }));

        await prisma.deliveryAddress.deleteMany({
            where: { enterpriseId: enterprise.id },
        });

        await prisma.deliveryAddress.createMany({
            data: deliveryAddresses,
            skipDuplicates: true,
        });
    }

    const [cityCount, stateCount] = await Promise.all([prisma.city.count(), prisma.state.count()]);
    if (cityCount < 4000 || stateCount < 20) await insertGeoData();

    if (env.ENVIRONMENT === "DEVELOPMENT") {
        console.log("Seed finalizada com sucesso!");
    }
};

export const sow = async () => {
    await clearData();
    await generateData();
};

sow()
    .catch((e) => {
        if (env.ENVIRONMENT === "DEVELOPMENT") console.error("Erro ao executar seed:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
