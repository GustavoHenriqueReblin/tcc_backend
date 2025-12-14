import fs from "fs";
import bcrypt from "bcrypt";
import { prisma } from "../src/config/prisma";
import {
    Role,
    Plan,
    Branch,
    Status,
    MaritalStatus,
    PersonType,
    ProductDefinitionType,
    PaymentStatus,
    PaymentMethod,
    TransactionType,
    AssetStatus,
    AssetMaintenanceType,
} from "@prisma/client";
import { insertGeoData } from "../src/cron/updateGeoData";
import { env } from "../src/config/env";
import { defaultUser } from "../src/config/default.data";

let nextId = -1;
const genId = () => nextId--;

export const clearData = async () => {
    // Limpa apenas as empresas com Ids negativos (usadas nos testes)
    const testEnterprises = await prisma.enterprise.findMany({
        where: { id: { lt: 0 } },
        select: { id: true },
    });

    for (const { id } of testEnterprises) {
        // Itens (filhos) primeiro
        await prisma.saleOrderItem.deleteMany({ where: { enterpriseId: id } });
        await prisma.purchaseOrderItem.deleteMany({ where: { enterpriseId: id } });
        await prisma.productionOrderInput.deleteMany({ where: { enterpriseId: id } });
        await prisma.recipeItem.deleteMany({ where: { enterpriseId: id } });

        // Tabelas principais
        await prisma.productionOrder.deleteMany({ where: { enterpriseId: id } });
        await prisma.saleOrder.deleteMany({ where: { enterpriseId: id } });
        await prisma.purchaseOrder.deleteMany({ where: { enterpriseId: id } });
        await prisma.recipe.deleteMany({ where: { enterpriseId: id } });
        await prisma.lot.deleteMany({ where: { enterpriseId: id } });

        // Demais dados
        await prisma.financialTransaction.deleteMany({ where: { enterpriseId: id } });
        await prisma.accountsReceivable.deleteMany({ where: { enterpriseId: id } });
        await prisma.accountsPayable.deleteMany({ where: { enterpriseId: id } });
        await prisma.audit.deleteMany({ where: { enterpriseId: id } });
        await prisma.log.deleteMany({ where: { enterpriseId: id } });
        await prisma.token.deleteMany({ where: { enterpriseId: id } });
        await prisma.inventoryMovement.deleteMany({ where: { enterpriseId: id } });
        await prisma.warehouse.deleteMany({ where: { enterpriseId: id } });
        await prisma.user.deleteMany({ where: { enterpriseId: id } });
        await prisma.productInventory.deleteMany({ where: { enterpriseId: id } });
        await prisma.product.deleteMany({ where: { enterpriseId: id } });
        await prisma.productDefinition.deleteMany({ where: { enterpriseId: id } });
        await prisma.unity.deleteMany({ where: { enterpriseId: id } });
        await prisma.deliveryAddress.deleteMany({ where: { enterpriseId: id } });
        await prisma.customer.deleteMany({ where: { enterpriseId: id } });
        await prisma.supplier.deleteMany({ where: { enterpriseId: id } });
        await prisma.assetMaintenance.deleteMany({ where: { enterpriseId: id } });
        await prisma.asset.deleteMany({ where: { enterpriseId: id } });
        await prisma.assetCategory.deleteMany({ where: { enterpriseId: id } });
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
        const enterpriseId = genId();

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
            phone: "(49) 99999-9999",
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
            id: genId(),
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
            phone: "(49) 99999-9999",
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
            id: genId(),
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
                    phone: "(49) 98888-8888",
                    street: "Rua Principal",
                    number: "200",
                    neighborhood: "Centro",
                    postalCode: "89900-111",
                },
                contact: {
                    name: "João da Silva",
                    phone: "(49) 98888-8888",
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
                    phone: "(49) 97777-7777",
                    street: "Av. das Palmeiras",
                    number: "150",
                    neighborhood: "Jardim América",
                    postalCode: "89900-222",
                },
                contact: {
                    name: "Maria Oliveira",
                    phone: "(49) 97777-7777",
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
                    phone: "(49) 96666-6666",
                    street: "Rua das Indústrias",
                    number: "890",
                    neighborhood: "Zona Norte",
                    postalCode: "89900-333",
                },
                contact: {
                    name: "Carlos Pereira",
                    phone: "(49) 96666-6666",
                    email: "carlos@superuniaosc.com",
                },
                status: Status.INACTIVE,
            },
        ];

        for (const customerData of customersData) {
            // Pessoa (cliente)
            const personData = {
                id: genId(),
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
            const customerId = genId();
            const customer = await prisma.customer.upsert({
                where: { personId: person.id },
                update: {
                    id: customerId,
                    contactName: customerData.contact.name,
                    contactEmail: customerData.contact.email,
                    contactPhone: customerData.contact.phone,
                    status: customerData.status,
                },
                create: {
                    id: customerId,
                    enterpriseId,
                    personId: person.id,
                    type: PersonType.BUSINESS,
                    contactName: customerData.contact.name,
                    contactEmail: customerData.contact.email,
                    contactPhone: customerData.contact.phone,
                    status: customerData.status,
                },
            });

            // Fornecedores padrão
            const suppliersData = [
                {
                    person: {
                        name: "Transportadora Rápida",
                        legalName: "Transportadora Rápida LTDA",
                        taxId: "22.333.444/0001-55",
                        email: "contato@transportadorarapida.com",
                        phone: "(49) 93456-7000",
                        street: "Rua Logística",
                        number: "45",
                        neighborhood: "Distrito Industrial",
                        postalCode: "89910-000",
                    },
                    contact: {
                        name: "Paulo Souza",
                        phone: "(49) 93456-7000",
                        email: "paulo@transportadorarapida.com",
                    },
                    status: Status.ACTIVE,
                },
                {
                    person: {
                        name: "Embalagens Sul",
                        legalName: "Embalagens Sul Indústria e Comércio LTDA",
                        taxId: "33.444.555/0001-66",
                        email: "vendas@embalagenssul.com",
                        phone: "(49) 94567-8000",
                        street: "Av. das Indústrias",
                        number: "1200",
                        neighborhood: "Polo Industrial",
                        postalCode: "89920-000",
                    },
                    contact: {
                        name: "Roberta Dias",
                        phone: "(49) 94567-8000",
                        email: "roberta@embalagenssul.com",
                    },
                    status: Status.ACTIVE,
                },
                {
                    person: {
                        name: "Agro Frutas Fornecimentos",
                        legalName: "Agro Frutas Fornecimentos LTDA",
                        taxId: "44.555.666/0001-77",
                        email: "contato@agrofrutas.com",
                        phone: "(49) 95678-9000",
                        street: "Estrada Rural",
                        number: "S/N",
                        neighborhood: "Interior",
                        postalCode: "89930-000",
                    },
                    contact: {
                        name: "Marcos Lima",
                        phone: "(49) 95678-9000",
                        email: "marcos@agrofrutas.com",
                    },
                    status: Status.INACTIVE,
                },
            ];

            for (const supplierData of suppliersData) {
                const personData = {
                    id: genId(),
                    enterpriseId,
                    countryId: country.id,
                    stateId: state.id,
                    cityId: city.id,
                    ...supplierData.person,
                };

                const person = await prisma.person.upsert({
                    where: {
                        enterpriseId_taxId: {
                            enterpriseId,
                            taxId: supplierData.person.taxId,
                        },
                    },
                    update: personData,
                    create: personData,
                });

                const supplierId = genId();
                await prisma.supplier.upsert({
                    where: { personId: person.id },
                    update: {
                        id: supplierId,
                        contactName: supplierData.contact.name,
                        contactEmail: supplierData.contact.email,
                        contactPhone: supplierData.contact.phone,
                        status: supplierData.status,
                    },
                    create: {
                        id: supplierId,
                        enterpriseId,
                        personId: person.id,
                        type: PersonType.BUSINESS,
                        contactName: supplierData.contact.name,
                        contactEmail: supplierData.contact.email,
                        contactPhone: supplierData.contact.phone,
                        status: supplierData.status,
                    },
                });
            }

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
                id: genId(),
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
            id: genId(),
            enterpriseId,
            simbol: "UN",
            description: "Unidade",
        };

        const unity = await prisma.unity.upsert({
            where: { enterpriseId_simbol: { enterpriseId, simbol: unityData.simbol } },
            update: unityData,
            create: unityData,
        });

        // Armazéns padrão
        const warehousesData = [
            {
                id: genId(),
                enterpriseId,
                code: "MAIN",
                name: "Armazém Principal",
                description: "Armazém principal da empresa",
            },
            {
                id: genId(),
                enterpriseId,
                code: "SEC",
                name: "Armazém Secundário",
                description: "Armazém secundário da empresa",
            },
        ];

        for (const wh of warehousesData) {
            await prisma.warehouse.upsert({
                where: { enterpriseId_code: { enterpriseId, code: wh.code } },
                update: wh,
                create: wh,
            });
        }

        // Ativos e categorias de ativos padrão
        const assetCategoriesData = [
            {
                id: genId(),
                enterpriseId,
                name: "Máquinas",
                description: "Equipamentos industriais e máquinas de produção",
            },
            {
                id: genId(),
                enterpriseId,
                name: "Veiculos",
                description: "Veículos utilizados na operação",
            },
            {
                id: genId(),
                enterpriseId,
                name: "Informática",
                description: "Computadores, servidores e periféricos",
            },
        ];

        const assetCategories = [];

        for (const catData of assetCategoriesData) {
            const existingCat = await prisma.assetCategory.findFirst({
                where: { enterpriseId, name: catData.name },
            });

            if (existingCat) {
                const category = await prisma.assetCategory.update({
                    where: { id: existingCat.id },
                    data: catData,
                });
                assetCategories.push(category);
            } else {
                const category = await prisma.assetCategory.create({
                    data: catData,
                });
                assetCategories.push(category);
            }
        }

        const today = new Date();
        const assetsData = [
            {
                id: genId(),
                enterpriseId,
                categoryId: assetCategories[0].id,
                name: "Envasadora Linha 1",
                acquisitionDate: today,
                acquisitionCost: 50000,
                usefulLifeMonths: 120,
                salvageValue: 5000,
                location: "Planta 1 - Linha de envase",
                status: AssetStatus.ACTIVE,
                notes: "Equipamento principal de envase",
            },
            {
                id: genId(),
                enterpriseId,
                categoryId: assetCategories[1].id,
                name: "Caminhao Bau 01",
                acquisitionDate: today,
                acquisitionCost: 200000,
                usefulLifeMonths: 180,
                salvageValue: 30000,
                location: "Patio externo",
                status: AssetStatus.ACTIVE,
                notes: "Veículo de distribuição regional",
            },
            {
                id: genId(),
                enterpriseId,
                categoryId: assetCategories[2].id,
                name: "Servidor de Aplicacao",
                acquisitionDate: today,
                acquisitionCost: 15000,
                usefulLifeMonths: 60,
                salvageValue: 2000,
                location: "Sala de TI",
                status: AssetStatus.ACTIVE,
                notes: "Servidor principal do sistema",
            },
        ];

        const assets = [];

        for (const assetData of assetsData) {
            const existingAsset = await prisma.asset.findFirst({
                where: { enterpriseId, name: assetData.name },
            });

            if (existingAsset) {
                const asset = await prisma.asset.update({
                    where: { id: existingAsset.id },
                    data: assetData,
                });
                assets.push(asset);
            } else {
                const asset = await prisma.asset.create({
                    data: assetData,
                });
                assets.push(asset);
            }
        }

        const maintenancesData = [
            {
                id: genId(),
                enterpriseId,
                assetId: assets[0].id,
                type: AssetMaintenanceType.PREVENTIVE,
                description: "Revisão preventiva anual",
                cost: 1500,
                date: new Date(),
                technician: "Equipe interna",
                notes: "Troca de filtros e lubrificação",
            },
            {
                id: genId(),
                enterpriseId,
                assetId: assets[0].id,
                type: AssetMaintenanceType.CORRECTIVE,
                description: "Troca de rolamentos",
                cost: 3200,
                date: new Date(),
                technician: "Assistência técnica",
                notes: "Parada de emergência após ruído",
            },
            {
                id: genId(),
                enterpriseId,
                assetId: assets[1].id,
                type: AssetMaintenanceType.INSPECTION,
                description: "Vistoria de freios e suspensão",
                cost: 800,
                date: new Date(),
                technician: "Oficina parceira",
                notes: "Recomendado alinhamento a cada 10 mil km",
            },
        ];

        for (const maint of maintenancesData) {
            await prisma.assetMaintenance.create({
                data: maint,
            });
        }

        // Definições de produto
        const productDefinitionsData = [
            {
                // Produto acabado
                id: genId(),
                enterpriseId,
                name: "Produto acabado",
                description: "Produto acabado — pronto para venda",
                type: ProductDefinitionType.FINISHED_PRODUCT,
            },
            {
                // Matéria-prima
                id: genId(),
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
            id: genId(),
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
                id: genId(),
                enterpriseId,
                productDefinitionId: rawMaterialDef!.id,
                unityId: unity.id,
                name: "Polpa de Uva",
                barcode: null,
            },
            {
                id: genId(),
                enterpriseId,
                productDefinitionId: rawMaterialDef!.id,
                unityId: unity.id,
                name: "Açúcar Cristal",
                barcode: null,
            },
            {
                id: genId(),
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
                id: genId(),
                productId: productFinished.id,
                costValue: 4.51,
                saleValue: 7.92,
                quantity: 120.84,
            },
            // Matérias primas
            ...rawProducts.map((raw, idx) => ({
                id: genId(),
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

        // Lotes, receitas, ordens de produção, vendas e compras (dados básicos)
        const lotCode = `LOT-${Math.abs(enterpriseId)}-001`;
        await prisma.lot.upsert({
            where: { code: lotCode },
            update: {
                enterpriseId,
                productId: productFinished.id,
                notes: "Lote inicial",
            },
            create: {
                id: genId(),
                enterpriseId,
                code: lotCode,
                productId: productFinished.id,
                harvestDate: new Date(),
                expiration: null,
                notes: "Lote inicial",
            },
        });

        // Receita para o produto acabado
        let recipe = await prisma.recipe.findFirst({
            where: { enterpriseId, productId: productFinished.id },
        });
        if (!recipe) {
            recipe = await prisma.recipe.create({
                data: {
                    id: genId(),
                    enterpriseId,
                    productId: productFinished.id,
                    description: "Receita padrão do Suco de Uva 1L",
                    notes: null,
                },
            });
        }
        // Limpa itens e recria com os 3 primeiros insumos
        const rmProducts = await prisma.product.findMany({
            where: { enterpriseId, productDefinitionId: rawMaterialDef!.id },
            take: 3,
            orderBy: { id: "asc" },
        });
        await prisma.recipeItem.deleteMany({ where: { enterpriseId, recipeId: recipe.id } });
        for (let idx = 0; idx < rmProducts.length; idx++) {
            const qty = idx === 2 ? 1 : 0.5 + idx * 0.1;
            await prisma.recipeItem.create({
                data: {
                    id: genId(),
                    enterpriseId,
                    recipeId: recipe.id,
                    productId: rmProducts[idx].id,
                    quantity: qty,
                },
            });
        }

        // Ordem de produção
        const prodOrderCode = `PROD-${Math.abs(enterpriseId)}-001`;
        const prodOrder = await prisma.productionOrder.upsert({
            where: { code: prodOrderCode },
            update: {
                enterpriseId,
                recipeId: recipe.id,
                productId: productFinished.id,
                lotId: (await prisma.lot.findFirst({ where: { code: lotCode } }))?.id ?? null,
                plannedQty: 100.0,
                notes: "Ordem inicial",
            },
            create: {
                id: genId(),
                enterpriseId,
                code: prodOrderCode,
                recipeId: recipe.id,
                productId: productFinished.id,
                lotId: (await prisma.lot.findFirst({ where: { code: lotCode } }))?.id ?? null,
                plannedQty: 100.0,
                producedQty: null,
                wasteQty: null,
                startDate: null,
                endDate: null,
                notes: "Ordem inicial",
            },
        });
        // Insumos da ordem
        await prisma.productionOrderInput.deleteMany({
            where: { enterpriseId, productionOrderId: prodOrder.id },
        });
        for (let idx = 0; idx < rmProducts.length; idx++) {
            await prisma.productionOrderInput.create({
                data: {
                    id: genId(),
                    enterpriseId,
                    productionOrderId: prodOrder.id,
                    productId: rmProducts[idx].id,
                    quantity: 10 + idx * 5,
                    unitCost: 2 + idx,
                },
            });
        }

        // Pedido de venda
        const anyCustomer = await prisma.customer.findFirst({ where: { enterpriseId } });
        if (anyCustomer) {
            const saleCode = `SO-${Math.abs(enterpriseId)}-001`;
            const sale = await prisma.saleOrder.upsert({
                where: { code: saleCode },
                update: {
                    enterpriseId,
                    customerId: anyCustomer.id,
                    totalValue: 79.2,
                    notes: "Pedido inicial",
                },
                create: {
                    id: genId(),
                    enterpriseId,
                    customerId: anyCustomer.id,
                    code: saleCode,
                    totalValue: 79.2,
                    notes: "Pedido inicial",
                },
            });
            await prisma.saleOrderItem.deleteMany({
                where: { enterpriseId, saleOrderId: sale.id },
            });
            await prisma.saleOrderItem.create({
                data: {
                    id: genId(),
                    enterpriseId,
                    saleOrderId: sale.id,
                    productId: productFinished.id,
                    quantity: 10,
                    unitPrice: 7.92,
                    productUnitPrice: 7.92,
                    unitCost: 4.51,
                },
            });

            // Conta a receber ligada ao pedido de venda
            const receivable = await prisma.accountsReceivable.create({
                data: {
                    id: genId(),
                    enterpriseId,
                    customerId: anyCustomer.id,
                    saleOrderId: sale.id,
                    description: "Conta a receber inicial",
                    value: 79.2,
                    dueDate: new Date(),
                    paymentDate: null,
                    method: PaymentMethod.PIX,
                    status: PaymentStatus.PENDING,
                    notes: "Gerada a partir do pedido inicial",
                },
            });

            // Lançamento financeiro de crédito referente à venda
            await prisma.financialTransaction.create({
                data: {
                    id: genId(),
                    enterpriseId,
                    type: TransactionType.CREDIT,
                    value: 79.2,
                    date: new Date(),
                    category: "Venda",
                    description: "Crédito previsto da venda inicial",
                    accountsReceivableId: receivable.id,
                    accountsPayableId: null,
                    notes: "Seed inicial",
                },
            });
        }

        // Compra
        const anySupplier = await prisma.supplier.findFirst({ where: { enterpriseId } });
        if (anySupplier) {
            const purchCode = `PO-${Math.abs(enterpriseId)}-001`;
            const purchase = await prisma.purchaseOrder.upsert({
                where: { code: purchCode },
                update: {
                    enterpriseId,
                    supplierId: anySupplier.id,
                    notes: "Compra inicial",
                },
                create: {
                    id: genId(),
                    enterpriseId,
                    supplierId: anySupplier.id,
                    code: purchCode,
                    notes: "Compra inicial",
                },
            });
            await prisma.purchaseOrderItem.deleteMany({
                where: { enterpriseId, purchaseOrderId: purchase.id },
            });
            if (rmProducts[0]) {
                await prisma.purchaseOrderItem.create({
                    data: {
                        id: genId(),
                        enterpriseId,
                        purchaseOrderId: purchase.id,
                        productId: rmProducts[0].id,
                        quantity: 50,
                        unitCost: 2.15,
                    },
                });
            }

            // Conta a pagar ligada à compra
            const payable = await prisma.accountsPayable.create({
                data: {
                    id: genId(),
                    enterpriseId,
                    supplierId: anySupplier.id,
                    purchaseOrderId: purchase.id,
                    description: "Conta a pagar inicial",
                    value: 107.5,
                    dueDate: new Date(),
                    paymentDate: null,
                    method: PaymentMethod.BANK_SLIP,
                    status: PaymentStatus.PENDING,
                    notes: "Gerada a partir da compra inicial",
                },
            });

            // Lançamento financeiro de débito referente à compra
            await prisma.financialTransaction.create({
                data: {
                    id: genId(),
                    enterpriseId,
                    type: TransactionType.DEBIT,
                    value: 107.5,
                    date: new Date(),
                    category: "Compra",
                    description: "Débito previsto da compra inicial",
                    accountsReceivableId: null,
                    accountsPayableId: payable.id,
                    notes: "Seed inicial",
                },
            });
        }
    }

    const [cityCount, stateCount] = await Promise.all([prisma.city.count(), prisma.state.count()]);
    if (cityCount < 4000 || stateCount < 20) await insertGeoData();

    if (env.ENVIRONMENT === "DEVELOPMENT") console.log("Seed de teste finalizada com sucesso!");

    fs.writeFileSync("seedData.json", JSON.stringify({ lastId: nextId }, null, 2));
};

const sow = async () => {
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
