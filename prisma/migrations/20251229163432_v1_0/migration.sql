-- CreateTable
CREATE TABLE `country` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(40) NOT NULL,
    `isoCode` CHAR(3) NOT NULL,

    UNIQUE INDEX `country_isoCode_key`(`isoCode`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `state` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `countryId` INTEGER NOT NULL,
    `name` VARCHAR(40) NOT NULL,
    `uf` CHAR(2) NOT NULL,
    `ibgeCode` INTEGER NOT NULL,

    UNIQUE INDEX `state_uf_key`(`uf`),
    UNIQUE INDEX `state_ibgeCode_key`(`ibgeCode`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `city` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `stateId` INTEGER NOT NULL,
    `name` VARCHAR(60) NOT NULL,
    `ibgeCode` INTEGER NOT NULL,

    UNIQUE INDEX `city_ibgeCode_key`(`ibgeCode`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `enterprise` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `countryId` INTEGER NOT NULL,
    `stateId` INTEGER NOT NULL,
    `cityId` INTEGER NOT NULL,
    `name` VARCHAR(80) NULL,
    `legalName` VARCHAR(80) NULL,
    `taxId` VARCHAR(20) NULL,
    `responsiblePerson` VARCHAR(40) NULL,
    `email` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NULL,
    `cellphone` VARCHAR(191) NULL,
    `stateRegistration` VARCHAR(40) NULL,
    `cityRegistration` VARCHAR(40) NULL,
    `maritalStatus` ENUM('SINGLE', 'MARRIED', 'DIVORCED', 'WIDOWED', 'SEPARATED', 'OTHER') NULL,
    `neighborhood` VARCHAR(40) NULL,
    `street` VARCHAR(40) NULL,
    `number` VARCHAR(40) NULL,
    `complement` VARCHAR(80) NULL,
    `postalCode` VARCHAR(20) NULL,
    `notes` VARCHAR(191) NULL,
    `logo` VARCHAR(191) NULL,
    `branch` ENUM('INDUSTRY') NOT NULL DEFAULT 'INDUSTRY',
    `plan` ENUM('START', 'PRO', 'BUSINESS') NOT NULL DEFAULT 'START',
    `status` ENUM('ACTIVE', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `enterprise_taxId_countryId_stateId_cityId_key`(`taxId`, `countryId`, `stateId`, `cityId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `person` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `enterpriseId` INTEGER NOT NULL,
    `countryId` INTEGER NULL,
    `stateId` INTEGER NULL,
    `cityId` INTEGER NULL,
    `name` VARCHAR(80) NULL,
    `legalName` VARCHAR(80) NULL,
    `taxId` VARCHAR(20) NULL,
    `nationalId` VARCHAR(20) NULL,
    `maritalStatus` ENUM('SINGLE', 'MARRIED', 'DIVORCED', 'WIDOWED', 'SEPARATED', 'OTHER') NULL,
    `neighborhood` VARCHAR(80) NULL,
    `street` VARCHAR(80) NULL,
    `number` VARCHAR(40) NULL,
    `complement` VARCHAR(80) NULL,
    `postalCode` VARCHAR(20) NULL,
    `notes` VARCHAR(191) NULL,
    `email` VARCHAR(40) NULL,
    `phone` VARCHAR(40) NULL,
    `cellphone` VARCHAR(40) NULL,
    `dateOfBirth` DATE NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `enterpriseId` INTEGER NOT NULL,
    `personId` INTEGER NOT NULL,
    `username` VARCHAR(191) NOT NULL,
    `password` VARCHAR(80) NOT NULL,
    `status` ENUM('ACTIVE', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE',
    `role` ENUM('EMPLOYEE', 'MANAGER', 'OWNER') NOT NULL DEFAULT 'EMPLOYEE',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `user_personId_key`(`personId`),
    UNIQUE INDEX `user_username_key`(`username`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `customer` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `enterpriseId` INTEGER NOT NULL,
    `personId` INTEGER NOT NULL,
    `status` ENUM('ACTIVE', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE',
    `type` ENUM('INDIVIDUAL', 'BUSINESS') NOT NULL DEFAULT 'INDIVIDUAL',
    `contactName` VARCHAR(80) NULL,
    `contactPhone` VARCHAR(20) NULL,
    `contactEmail` VARCHAR(40) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `customer_personId_key`(`personId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `supplier` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `enterpriseId` INTEGER NOT NULL,
    `personId` INTEGER NOT NULL,
    `status` ENUM('ACTIVE', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE',
    `type` ENUM('INDIVIDUAL', 'BUSINESS') NOT NULL DEFAULT 'BUSINESS',
    `contactName` VARCHAR(80) NULL,
    `contactPhone` VARCHAR(20) NULL,
    `contactEmail` VARCHAR(40) NULL,
    `website` VARCHAR(100) NULL,
    `paymentTerms` VARCHAR(40) NULL,
    `deliveryTime` VARCHAR(40) NULL,
    `category` VARCHAR(60) NULL,
    `notes` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `supplier_personId_key`(`personId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `deliveryaddress` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `customerId` INTEGER NOT NULL,
    `enterpriseId` INTEGER NOT NULL,
    `label` VARCHAR(40) NULL,
    `street` VARCHAR(80) NULL,
    `number` VARCHAR(40) NULL,
    `neighborhood` VARCHAR(40) NULL,
    `complement` VARCHAR(80) NULL,
    `reference` VARCHAR(80) NULL,
    `postalCode` VARCHAR(20) NULL,
    `cityId` INTEGER NOT NULL,
    `stateId` INTEGER NOT NULL,
    `countryId` INTEGER NULL,
    `isDefault` BOOLEAN NOT NULL DEFAULT false,
    `status` ENUM('ACTIVE', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `token` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `enterpriseId` INTEGER NOT NULL,
    `token` VARCHAR(512) NOT NULL,
    `valid` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `token_token_key`(`token`),
    INDEX `token_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `audit` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `enterpriseId` INTEGER NOT NULL,
    `action` VARCHAR(191) NOT NULL,
    `entity` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `log` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `message` TEXT NOT NULL,
    `stack` TEXT NULL,
    `context` VARCHAR(191) NULL,
    `enterpriseId` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `productdefinition` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `enterpriseId` INTEGER NOT NULL,
    `name` VARCHAR(40) NOT NULL,
    `description` VARCHAR(191) NULL,
    `type` ENUM('RAW_MATERIAL', 'FINISHED_PRODUCT', 'RESALE_PRODUCT', 'IN_PROCESS_PRODUCT', 'COMPONENT', 'CONSUMABLE_MATERIAL', 'PACKAGING_MATERIAL', 'BY_PRODUCT', 'RETURNED_PRODUCT') NOT NULL,
    `createdAt` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` TIMESTAMP(3) NOT NULL,

    UNIQUE INDEX `productdefinition_enterpriseId_name_key`(`enterpriseId`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `unity` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `enterpriseId` INTEGER NOT NULL,
    `simbol` VARCHAR(8) NOT NULL,
    `description` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `unity_enterpriseId_simbol_key`(`enterpriseId`, `simbol`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `product` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `enterpriseId` INTEGER NOT NULL,
    `productDefinitionId` INTEGER NULL,
    `unityId` INTEGER NULL,
    `name` VARCHAR(80) NOT NULL,
    `barcode` VARCHAR(40) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `productinventory` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `enterpriseId` INTEGER NOT NULL,
    `productId` INTEGER NOT NULL,
    `costValue` DECIMAL(14, 6) NOT NULL,
    `saleValue` DECIMAL(14, 6) NOT NULL,
    `quantity` DECIMAL(14, 6) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `productinventory_enterpriseId_productId_key`(`enterpriseId`, `productId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `warehouse` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `enterpriseId` INTEGER NOT NULL,
    `code` VARCHAR(20) NOT NULL,
    `name` VARCHAR(80) NOT NULL,
    `description` VARCHAR(120) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `warehouse_enterpriseId_code_key`(`enterpriseId`, `code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `inventorymovement` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `enterpriseId` INTEGER NOT NULL,
    `productId` INTEGER NOT NULL,
    `warehouseId` INTEGER NOT NULL,
    `lotId` INTEGER NULL,
    `direction` ENUM('IN', 'OUT') NOT NULL,
    `source` ENUM('PURCHASE', 'HARVEST', 'SALE', 'ADJUSTMENT', 'PRODUCTION') NOT NULL,
    `quantity` DECIMAL(14, 6) NOT NULL,
    `balance` DECIMAL(14, 6) NOT NULL,
    `unitCost` DECIMAL(14, 6) NULL,
    `reference` VARCHAR(80) NULL,
    `notes` VARCHAR(191) NULL,
    `supplierId` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `inventorymovement_enterpriseId_productId_idx`(`enterpriseId`, `productId`),
    INDEX `inventorymovement_warehouseId_idx`(`warehouseId`),
    INDEX `inventorymovement_direction_idx`(`direction`),
    INDEX `inventorymovement_source_idx`(`source`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `lot` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `enterpriseId` INTEGER NOT NULL,
    `code` VARCHAR(40) NOT NULL,
    `productId` INTEGER NULL,
    `harvestDate` DATE NULL,
    `expiration` DATE NULL,
    `notes` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `lot_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `recipe` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `enterpriseId` INTEGER NOT NULL,
    `productId` INTEGER NOT NULL,
    `description` VARCHAR(191) NULL,
    `notes` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `recipeitem` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `enterpriseId` INTEGER NOT NULL,
    `recipeId` INTEGER NOT NULL,
    `productId` INTEGER NOT NULL,
    `quantity` DECIMAL(14, 6) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `productionorder` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `enterpriseId` INTEGER NOT NULL,
    `code` VARCHAR(40) NOT NULL,
    `recipeId` INTEGER NOT NULL,
    `warehouseId` INTEGER NOT NULL,
    `lotId` INTEGER NULL,
    `status` ENUM('PLANNED', 'RUNNING', 'FINISHED', 'CANCELED') NOT NULL DEFAULT 'PLANNED',
    `plannedQty` DECIMAL(14, 6) NOT NULL,
    `producedQty` DECIMAL(14, 6) NULL,
    `wasteQty` DECIMAL(14, 6) NULL,
    `otherCosts` DECIMAL(14, 6) NULL,
    `startDate` DATETIME(3) NULL,
    `endDate` DATETIME(3) NULL,
    `notes` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `productId` INTEGER NULL,

    UNIQUE INDEX `productionorder_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `productionorderinput` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `enterpriseId` INTEGER NOT NULL,
    `productionOrderId` INTEGER NOT NULL,
    `productId` INTEGER NOT NULL,
    `quantity` DECIMAL(14, 6) NOT NULL,
    `unitCost` DECIMAL(14, 6) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `saleorder` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `enterpriseId` INTEGER NOT NULL,
    `customerId` INTEGER NOT NULL,
    `code` VARCHAR(40) NOT NULL,
    `status` ENUM('PENDING', 'APPROVED', 'SHIPPED', 'RECEIVED', 'FINISHED', 'CANCELED') NOT NULL DEFAULT 'PENDING',
    `totalValue` DECIMAL(14, 6) NOT NULL,
    `notes` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `saleorder_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `saleorderitem` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `enterpriseId` INTEGER NOT NULL,
    `saleOrderId` INTEGER NOT NULL,
    `productId` INTEGER NOT NULL,
    `quantity` DECIMAL(14, 6) NOT NULL,
    `unitPrice` DECIMAL(14, 6) NOT NULL,
    `productUnitPrice` DECIMAL(14, 6) NOT NULL,
    `unitCost` DECIMAL(14, 6) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `purchaseorder` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `enterpriseId` INTEGER NOT NULL,
    `supplierId` INTEGER NOT NULL,
    `code` VARCHAR(40) NOT NULL,
    `status` ENUM('PENDING', 'APPROVED', 'SHIPPED', 'RECEIVED', 'FINISHED', 'CANCELED') NOT NULL DEFAULT 'PENDING',
    `notes` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `purchaseorder_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `purchaseorderitem` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `enterpriseId` INTEGER NOT NULL,
    `purchaseOrderId` INTEGER NOT NULL,
    `productId` INTEGER NOT NULL,
    `quantity` DECIMAL(14, 6) NOT NULL,
    `unitCost` DECIMAL(14, 6) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `accountsreceivable` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `enterpriseId` INTEGER NOT NULL,
    `customerId` INTEGER NULL,
    `saleOrderId` INTEGER NULL,
    `description` VARCHAR(120) NULL,
    `value` DECIMAL(14, 6) NOT NULL,
    `dueDate` DATE NOT NULL,
    `paymentDate` DATE NULL,
    `method` ENUM('CASH', 'PIX', 'CARD', 'BANK_SLIP', 'TRANSFER', 'OTHER') NULL,
    `status` ENUM('PENDING', 'PAID', 'OVERDUE', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    `notes` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `accountsreceivable_enterpriseId_idx`(`enterpriseId`),
    INDEX `accountsreceivable_customerId_idx`(`customerId`),
    INDEX `accountsreceivable_saleOrderId_idx`(`saleOrderId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `accountspayable` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `enterpriseId` INTEGER NOT NULL,
    `supplierId` INTEGER NULL,
    `purchaseOrderId` INTEGER NULL,
    `description` VARCHAR(120) NULL,
    `value` DECIMAL(14, 6) NOT NULL,
    `dueDate` DATE NOT NULL,
    `paymentDate` DATE NULL,
    `method` ENUM('CASH', 'PIX', 'CARD', 'BANK_SLIP', 'TRANSFER', 'OTHER') NULL,
    `status` ENUM('PENDING', 'PAID', 'OVERDUE', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    `notes` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `accountspayable_enterpriseId_idx`(`enterpriseId`),
    INDEX `accountspayable_supplierId_idx`(`supplierId`),
    INDEX `accountspayable_purchaseOrderId_idx`(`purchaseOrderId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `financialtransaction` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `enterpriseId` INTEGER NOT NULL,
    `type` ENUM('CREDIT', 'DEBIT') NOT NULL,
    `value` DECIMAL(14, 6) NOT NULL,
    `date` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `category` VARCHAR(60) NULL,
    `description` VARCHAR(120) NULL,
    `accountsReceivableId` INTEGER NULL,
    `accountsPayableId` INTEGER NULL,
    `notes` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `financialtransaction_enterpriseId_idx`(`enterpriseId`),
    INDEX `financialtransaction_accountsReceivableId_idx`(`accountsReceivableId`),
    INDEX `financialtransaction_accountsPayableId_idx`(`accountsPayableId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `assetcategory` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `enterpriseId` INTEGER NOT NULL,
    `name` VARCHAR(40) NOT NULL,
    `description` VARCHAR(120) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `assetcategory_enterpriseId_name_key`(`enterpriseId`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `asset` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `enterpriseId` INTEGER NOT NULL,
    `categoryId` INTEGER NOT NULL,
    `name` VARCHAR(80) NOT NULL,
    `acquisitionDate` DATE NOT NULL,
    `acquisitionCost` DECIMAL(14, 6) NOT NULL,
    `usefulLifeMonths` INTEGER NOT NULL,
    `salvageValue` DECIMAL(14, 6) NOT NULL,
    `location` VARCHAR(80) NULL,
    `status` ENUM('ACTIVE', 'INACTIVE', 'SOLD', 'DISPOSED', 'LOST') NOT NULL DEFAULT 'ACTIVE',
    `notes` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `asset_enterpriseId_idx`(`enterpriseId`),
    INDEX `asset_categoryId_idx`(`categoryId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `assetmaintenance` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `enterpriseId` INTEGER NOT NULL,
    `assetId` INTEGER NOT NULL,
    `type` ENUM('CLEANING', 'LUBRICATION', 'ADJUSTMENT', 'PART_REPLACEMENT', 'INSPECTION', 'CORRECTIVE', 'PREVENTIVE', 'OTHER') NOT NULL DEFAULT 'OTHER',
    `description` VARCHAR(200) NULL,
    `cost` DECIMAL(14, 6) NULL,
    `date` DATE NOT NULL,
    `technician` VARCHAR(80) NULL,
    `notes` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `assetmaintenance_enterpriseId_idx`(`enterpriseId`),
    INDEX `assetmaintenance_assetId_idx`(`assetId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `state` ADD CONSTRAINT `state_countryId_fkey` FOREIGN KEY (`countryId`) REFERENCES `country`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `city` ADD CONSTRAINT `city_stateId_fkey` FOREIGN KEY (`stateId`) REFERENCES `state`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `enterprise` ADD CONSTRAINT `enterprise_countryId_fkey` FOREIGN KEY (`countryId`) REFERENCES `country`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `enterprise` ADD CONSTRAINT `enterprise_stateId_fkey` FOREIGN KEY (`stateId`) REFERENCES `state`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `enterprise` ADD CONSTRAINT `enterprise_cityId_fkey` FOREIGN KEY (`cityId`) REFERENCES `city`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `person` ADD CONSTRAINT `person_enterpriseId_fkey` FOREIGN KEY (`enterpriseId`) REFERENCES `enterprise`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `person` ADD CONSTRAINT `person_countryId_fkey` FOREIGN KEY (`countryId`) REFERENCES `country`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `person` ADD CONSTRAINT `person_stateId_fkey` FOREIGN KEY (`stateId`) REFERENCES `state`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `person` ADD CONSTRAINT `person_cityId_fkey` FOREIGN KEY (`cityId`) REFERENCES `city`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user` ADD CONSTRAINT `user_enterpriseId_fkey` FOREIGN KEY (`enterpriseId`) REFERENCES `enterprise`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user` ADD CONSTRAINT `user_personId_fkey` FOREIGN KEY (`personId`) REFERENCES `person`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `customer` ADD CONSTRAINT `customer_enterpriseId_fkey` FOREIGN KEY (`enterpriseId`) REFERENCES `enterprise`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `customer` ADD CONSTRAINT `customer_personId_fkey` FOREIGN KEY (`personId`) REFERENCES `person`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `supplier` ADD CONSTRAINT `supplier_enterpriseId_fkey` FOREIGN KEY (`enterpriseId`) REFERENCES `enterprise`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `supplier` ADD CONSTRAINT `supplier_personId_fkey` FOREIGN KEY (`personId`) REFERENCES `person`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `deliveryaddress` ADD CONSTRAINT `deliveryaddress_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `customer`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `deliveryaddress` ADD CONSTRAINT `deliveryaddress_enterpriseId_fkey` FOREIGN KEY (`enterpriseId`) REFERENCES `enterprise`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `deliveryaddress` ADD CONSTRAINT `deliveryaddress_cityId_fkey` FOREIGN KEY (`cityId`) REFERENCES `city`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `deliveryaddress` ADD CONSTRAINT `deliveryaddress_stateId_fkey` FOREIGN KEY (`stateId`) REFERENCES `state`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `deliveryaddress` ADD CONSTRAINT `deliveryaddress_countryId_fkey` FOREIGN KEY (`countryId`) REFERENCES `country`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `token` ADD CONSTRAINT `token_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `token` ADD CONSTRAINT `token_enterpriseId_fkey` FOREIGN KEY (`enterpriseId`) REFERENCES `enterprise`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `audit` ADD CONSTRAINT `audit_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `audit` ADD CONSTRAINT `audit_enterpriseId_fkey` FOREIGN KEY (`enterpriseId`) REFERENCES `enterprise`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `log` ADD CONSTRAINT `log_enterpriseId_fkey` FOREIGN KEY (`enterpriseId`) REFERENCES `enterprise`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `productdefinition` ADD CONSTRAINT `productdefinition_enterpriseId_fkey` FOREIGN KEY (`enterpriseId`) REFERENCES `enterprise`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `unity` ADD CONSTRAINT `unity_enterpriseId_fkey` FOREIGN KEY (`enterpriseId`) REFERENCES `enterprise`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `product` ADD CONSTRAINT `product_enterpriseId_fkey` FOREIGN KEY (`enterpriseId`) REFERENCES `enterprise`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `product` ADD CONSTRAINT `product_productDefinitionId_fkey` FOREIGN KEY (`productDefinitionId`) REFERENCES `productdefinition`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `product` ADD CONSTRAINT `product_unityId_fkey` FOREIGN KEY (`unityId`) REFERENCES `unity`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `productinventory` ADD CONSTRAINT `productinventory_enterpriseId_fkey` FOREIGN KEY (`enterpriseId`) REFERENCES `enterprise`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `productinventory` ADD CONSTRAINT `productinventory_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `product`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `warehouse` ADD CONSTRAINT `warehouse_enterpriseId_fkey` FOREIGN KEY (`enterpriseId`) REFERENCES `enterprise`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventorymovement` ADD CONSTRAINT `inventorymovement_enterpriseId_fkey` FOREIGN KEY (`enterpriseId`) REFERENCES `enterprise`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventorymovement` ADD CONSTRAINT `inventorymovement_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `product`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventorymovement` ADD CONSTRAINT `inventorymovement_warehouseId_fkey` FOREIGN KEY (`warehouseId`) REFERENCES `warehouse`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventorymovement` ADD CONSTRAINT `inventorymovement_supplierId_fkey` FOREIGN KEY (`supplierId`) REFERENCES `supplier`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventorymovement` ADD CONSTRAINT `inventorymovement_lotId_fkey` FOREIGN KEY (`lotId`) REFERENCES `lot`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lot` ADD CONSTRAINT `lot_enterpriseId_fkey` FOREIGN KEY (`enterpriseId`) REFERENCES `enterprise`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lot` ADD CONSTRAINT `lot_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `product`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `recipe` ADD CONSTRAINT `recipe_enterpriseId_fkey` FOREIGN KEY (`enterpriseId`) REFERENCES `enterprise`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `recipe` ADD CONSTRAINT `recipe_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `product`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `recipeitem` ADD CONSTRAINT `recipeitem_enterpriseId_fkey` FOREIGN KEY (`enterpriseId`) REFERENCES `enterprise`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `recipeitem` ADD CONSTRAINT `recipeitem_recipeId_fkey` FOREIGN KEY (`recipeId`) REFERENCES `recipe`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `recipeitem` ADD CONSTRAINT `recipeitem_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `product`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `productionorder` ADD CONSTRAINT `productionorder_enterpriseId_fkey` FOREIGN KEY (`enterpriseId`) REFERENCES `enterprise`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `productionorder` ADD CONSTRAINT `productionorder_recipeId_fkey` FOREIGN KEY (`recipeId`) REFERENCES `recipe`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `productionorder` ADD CONSTRAINT `productionorder_warehouseId_fkey` FOREIGN KEY (`warehouseId`) REFERENCES `warehouse`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `productionorder` ADD CONSTRAINT `productionorder_lotId_fkey` FOREIGN KEY (`lotId`) REFERENCES `lot`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `productionorder` ADD CONSTRAINT `productionorder_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `product`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `productionorderinput` ADD CONSTRAINT `productionorderinput_enterpriseId_fkey` FOREIGN KEY (`enterpriseId`) REFERENCES `enterprise`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `productionorderinput` ADD CONSTRAINT `productionorderinput_productionOrderId_fkey` FOREIGN KEY (`productionOrderId`) REFERENCES `productionorder`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `productionorderinput` ADD CONSTRAINT `productionorderinput_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `product`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `saleorder` ADD CONSTRAINT `saleorder_enterpriseId_fkey` FOREIGN KEY (`enterpriseId`) REFERENCES `enterprise`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `saleorder` ADD CONSTRAINT `saleorder_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `customer`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `saleorderitem` ADD CONSTRAINT `saleorderitem_enterpriseId_fkey` FOREIGN KEY (`enterpriseId`) REFERENCES `enterprise`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `saleorderitem` ADD CONSTRAINT `saleorderitem_saleOrderId_fkey` FOREIGN KEY (`saleOrderId`) REFERENCES `saleorder`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `saleorderitem` ADD CONSTRAINT `saleorderitem_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `product`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `purchaseorder` ADD CONSTRAINT `purchaseorder_enterpriseId_fkey` FOREIGN KEY (`enterpriseId`) REFERENCES `enterprise`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `purchaseorder` ADD CONSTRAINT `purchaseorder_supplierId_fkey` FOREIGN KEY (`supplierId`) REFERENCES `supplier`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `purchaseorderitem` ADD CONSTRAINT `purchaseorderitem_enterpriseId_fkey` FOREIGN KEY (`enterpriseId`) REFERENCES `enterprise`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `purchaseorderitem` ADD CONSTRAINT `purchaseorderitem_purchaseOrderId_fkey` FOREIGN KEY (`purchaseOrderId`) REFERENCES `purchaseorder`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `purchaseorderitem` ADD CONSTRAINT `purchaseorderitem_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `product`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `accountsreceivable` ADD CONSTRAINT `accountsreceivable_enterpriseId_fkey` FOREIGN KEY (`enterpriseId`) REFERENCES `enterprise`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `accountsreceivable` ADD CONSTRAINT `accountsreceivable_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `customer`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `accountsreceivable` ADD CONSTRAINT `accountsreceivable_saleOrderId_fkey` FOREIGN KEY (`saleOrderId`) REFERENCES `saleorder`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `accountspayable` ADD CONSTRAINT `accountspayable_enterpriseId_fkey` FOREIGN KEY (`enterpriseId`) REFERENCES `enterprise`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `accountspayable` ADD CONSTRAINT `accountspayable_supplierId_fkey` FOREIGN KEY (`supplierId`) REFERENCES `supplier`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `accountspayable` ADD CONSTRAINT `accountspayable_purchaseOrderId_fkey` FOREIGN KEY (`purchaseOrderId`) REFERENCES `purchaseorder`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `financialtransaction` ADD CONSTRAINT `financialtransaction_enterpriseId_fkey` FOREIGN KEY (`enterpriseId`) REFERENCES `enterprise`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `financialtransaction` ADD CONSTRAINT `financialtransaction_accountsReceivableId_fkey` FOREIGN KEY (`accountsReceivableId`) REFERENCES `accountsreceivable`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `financialtransaction` ADD CONSTRAINT `financialtransaction_accountsPayableId_fkey` FOREIGN KEY (`accountsPayableId`) REFERENCES `accountspayable`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `assetcategory` ADD CONSTRAINT `assetcategory_enterpriseId_fkey` FOREIGN KEY (`enterpriseId`) REFERENCES `enterprise`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `asset` ADD CONSTRAINT `asset_enterpriseId_fkey` FOREIGN KEY (`enterpriseId`) REFERENCES `enterprise`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `asset` ADD CONSTRAINT `asset_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `assetcategory`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `assetmaintenance` ADD CONSTRAINT `assetmaintenance_enterpriseId_fkey` FOREIGN KEY (`enterpriseId`) REFERENCES `enterprise`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `assetmaintenance` ADD CONSTRAINT `assetmaintenance_assetId_fkey` FOREIGN KEY (`assetId`) REFERENCES `asset`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
