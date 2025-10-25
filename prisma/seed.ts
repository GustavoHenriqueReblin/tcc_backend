import { prisma } from "@config/prisma";
import { Role, Plan, Product, Status, MaritalStatus } from "@prisma/client";
import { insertGeoData } from "@cron/updateGeoData";
import dotenv from "dotenv";
import bcrypt from "bcrypt";

dotenv.config();

const main = async () => {
    console.log("Inserindo dados iniciais...");

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
        where: { taxId: "123.456.78/0001-00" },
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
        where: { taxId: "123.456.789-00" },
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
            password: await bcrypt.hash(process.env.APP_SECRET! + "123456", 10),
            role: Role.OWNER,
            status: Status.ACTIVE,
        },
    });

    await insertGeoData();

    console.log("Seed finalizada com sucesso!");
};

main()
    .catch((e) => {
        console.error("Erro ao executar seed:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
