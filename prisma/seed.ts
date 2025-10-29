import bcrypt from "bcrypt";
import { prisma } from "../src/config/prisma";
import {
    Role,
    Plan,
    Branch,
    Status,
    MaritalStatus,
    CustomerType,
    ProductDefinitionType,
} from "@prisma/client";
import { insertGeoData } from "../src/cron/updateGeoData";
import { env } from "../src/config/env";
import { defaultUser } from "../src/config/default.data";

export const clearData = async () => {
    // Limpa apenas as empresas com Ids negativos (usadas nos testes)
    const testEnterprises = await prisma.enterprise.findMany({
        where: { id: { lt: 0 } },
        select: { id: true },
    });

    for (const { id } of testEnterprises) {
        await prisma.audit.deleteMany({ where: { enterpriseId: id } });
        await prisma.log.deleteMany({ where: { enterpriseId: id } });
        await prisma.token.deleteMany({ where: { enterpriseId: id } });
        await prisma.user.deleteMany({ where: { enterpriseId: id } });
        await prisma.productInventory.deleteMany({ where: { enterpriseId: id } });
        await prisma.product.deleteMany({ where: { enterpriseId: id } });
        await prisma.productDefinition.deleteMany({ where: { enterpriseId: id } });
        await prisma.unity.deleteMany({ where: { enterpriseId: id } });
        await prisma.deliveryAddress.deleteMany({ where: { enterpriseId: id } });
        await prisma.customer.deleteMany({ where: { enterpriseId: id } });
        await prisma.person.deleteMany({ where: { enterpriseId: id } });
        await prisma.enterprise.deleteMany({ where: { id } });
    }
};

export const generateData = async () => {
    if (env.ENVIRONMENT === "DEVELOPMENT") console.log("Inserindo dados de teste...");

    const country = await prisma.country.upsert({
        where: { isoCode: "BRA" },
        update: {},
        create: { name: "Brazil", isoCode: "BRA" },
    });

    const state = await prisma.state.upsert({
        where: { ibgeCode: 42 },
        update: {},
        create: { name: "Santa Catarina", uf: "SC", ibgeCode: 42, countryId: country.id },
    });

    const city = await prisma.city.upsert({
        where: { ibgeCode: 4217202 },
        update: {},
        create: { name: "São Miguel do Oeste", ibgeCode: 4217202, stateId: state.id },
    });

    // 3 empresas com Ids negativos
    for (let i = 1; i <= 3; i++) {
        const enterpriseId = -i;

        const enterpriseData = {
            id: enterpriseId,
            countryId: country.id,
            stateId: state.id,
            cityId: city.id,
            name: `TCC Test Factory ${i}`,
            legalName: `TCC Test Factory LTDA ${i}`,
            taxId: `999.000.00${i}/0001-00`,
            responsiblePerson: "Gustavo Hique",
            email: `contact${i}@testfactory.com`,
            phone: "+55 (49) 99999-9999",
            street: "Rua das Laranjeiras",
            number: "100",
            neighborhood: "Centro",
            postalCode: "89900-000",
            plan: Plan.START,
            branch: Branch.INDUSTRY,
            status: Status.ACTIVE,
        };

        await prisma.enterprise.upsert({
            where: { id: enterpriseId },
            update: enterpriseData,
            create: enterpriseData,
        });

        // Pessoa / usuário padrão
        const userPersonData = {
            enterpriseId,
            countryId: country.id,
            stateId: state.id,
            cityId: city.id,
            name: "Gustavo Hique",
            legalName: "Gustavo Hique",
            taxId: `123.456.789-${i}0`,
            nationalId: "1122334455",
            maritalStatus: MaritalStatus.SINGLE,
            email: `gustavo${i}@example.com`,
            phone: "+55 (49) 99999-9999",
            neighborhood: "Centro",
            street: "Rua das Laranjeiras",
            number: "100",
            postalCode: "89900000",
        };

        const userPerson = await prisma.person.upsert({
            where: {
                enterpriseId_taxId: { enterpriseId, taxId: userPersonData.taxId },
            },
            update: userPersonData,
            create: userPersonData,
        });

        const userData = {
            enterpriseId,
            personId: userPerson.id,
            username: defaultUser.username(i),
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
                enterpriseId,
                countryId: country.id,
                stateId: state.id,
                cityId: city.id,
                ...customerData.person,
            };

            const person = await prisma.person.upsert({
                where: {
                    enterpriseId_taxId: {
                        enterpriseId,
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
                    enterpriseId,
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
                enterpriseId,
                cityId: city.id,
                stateId: state.id,
                countryId: country.id,
            }));

            await prisma.deliveryAddress.deleteMany({
                where: { enterpriseId },
            });

            await prisma.deliveryAddress.createMany({
                data: deliveryAddresses,
                skipDuplicates: true,
            });
        }

        // Unidade padrão
        const unityData = {
            enterpriseId,
            simbol: "UN",
            description: "Unidade",
        };

        const unity = await prisma.unity.upsert({
            where: { enterpriseId_simbol: { enterpriseId, simbol: unityData.simbol } },
            update: unityData,
            create: unityData,
        });

        // Definições de produto
        const productDefinitionsData = [
            {
                // Produto acabado
                enterpriseId,
                name: "Produto acabado",
                description: "Produto acabado — pronto para venda",
                type: ProductDefinitionType.FINISHED_PRODUCT,
            },
            {
                // Matéria-prima
                enterpriseId,
                name: "Matéria prima",
                description: "Insumos utilizados na produção",
                type: ProductDefinitionType.RAW_MATERIAL,
            },
        ];

        for (const defData of productDefinitionsData) {
            const existingDef = await prisma.productDefinition.findFirst({
                where: {
                    enterpriseId: defData.enterpriseId,
                    type: defData.type,
                },
            });

            if (existingDef) {
                await prisma.productDefinition.update({
                    where: { id: existingDef.id },
                    data: defData,
                });
            } else {
                await prisma.productDefinition.create({
                    data: defData,
                });
            }
        }

        const finishedProductDef = await prisma.productDefinition.findFirst({
            where: { enterpriseId, type: ProductDefinitionType.FINISHED_PRODUCT },
        });

        const rawMaterialDef = await prisma.productDefinition.findFirst({
            where: { enterpriseId, type: ProductDefinitionType.RAW_MATERIAL },
        });

        // Produto acabado
        const productDataFinished = {
            enterpriseId,
            productDefinitionId: finishedProductDef!.id,
            unityId: unity.id,
            name: "Suco de Uva 1L",
            barcode: `78912345678${i}`,
        };

        let productFinished = await prisma.product.findFirst({
            where: { enterpriseId, name: productDataFinished.name },
        });

        if (productFinished) {
            productFinished = await prisma.product.update({
                where: { id: productFinished.id },
                data: productDataFinished,
            });
        } else {
            productFinished = await prisma.product.create({
                data: productDataFinished,
            });
        }

        // Matérias primas
        const rawMaterialsData = [
            {
                enterpriseId,
                productDefinitionId: rawMaterialDef!.id,
                unityId: unity.id,
                name: "Polpa de Uva",
                barcode: null,
            },
            {
                enterpriseId,
                productDefinitionId: rawMaterialDef!.id,
                unityId: unity.id,
                name: "Açúcar Cristal",
                barcode: null,
            },
            {
                enterpriseId,
                productDefinitionId: rawMaterialDef!.id,
                unityId: unity.id,
                name: "Garrafa PET 1L",
                barcode: null,
            },
        ];

        for (const materialData of rawMaterialsData) {
            const existingMat = await prisma.product.findFirst({
                where: {
                    enterpriseId,
                    name: materialData.name,
                },
            });

            if (existingMat) {
                await prisma.product.update({
                    where: { id: existingMat.id },
                    data: materialData,
                });
            } else {
                await prisma.product.create({
                    data: materialData,
                });
            }
        }

        // Estoque inicial
        const rawProducts = await prisma.product.findMany({
            where: {
                enterpriseId,
                productDefinitionId: rawMaterialDef!.id,
            },
        });

        const inventoryData = [
            // Produto acabado
            {
                productId: productFinished.id,
                costValue: 4.51,
                saleValue: 7.92,
                quantity: 120.84,
            },
            // Matérias primas
            ...rawProducts.map((raw, idx) => ({
                productId: raw.id,
                costValue: 1.62 + idx * 0.5,
                saleValue: 0,
                quantity: 500.48 - idx * 50,
            })),
        ];

        for (const inv of inventoryData) {
            const existingInventory = await prisma.productInventory.findFirst({
                where: { enterpriseId, productId: inv.productId },
            });

            if (existingInventory) {
                await prisma.productInventory.update({
                    where: { id: existingInventory.id },
                    data: inv,
                });
            } else {
                await prisma.productInventory.create({
                    data: { enterpriseId, ...inv },
                });
            }
        }
    }

    const [cityCount, stateCount] = await Promise.all([prisma.city.count(), prisma.state.count()]);
    if (cityCount < 4000 || stateCount < 20) await insertGeoData();

    if (env.ENVIRONMENT === "DEVELOPMENT") console.log("Seed de teste finalizada com sucesso!");
};

export const sow = async () => {
    await prisma.$executeRawUnsafe(`SET GLOBAL time_zone = '-03:00'`);
    await prisma.$executeRawUnsafe(`SET time_zone = '-03:00'`);

    await clearData();
    await generateData();
};

sow()
    .catch((e) => {
        console.error("Erro ao executar seed:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
