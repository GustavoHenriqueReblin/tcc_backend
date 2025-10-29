/*
  Warnings:

  - You are about to alter the column `name` on the `city` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `VarChar(60)`.
  - You are about to alter the column `name` on the `country` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `VarChar(40)`.
  - You are about to alter the column `contactName` on the `customer` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `VarChar(80)`.
  - You are about to alter the column `contactPhone` on the `customer` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `VarChar(20)`.
  - You are about to alter the column `contactEmail` on the `customer` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `VarChar(40)`.
  - You are about to alter the column `label` on the `deliveryaddress` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `VarChar(40)`.
  - You are about to alter the column `street` on the `deliveryaddress` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `VarChar(80)`.
  - You are about to alter the column `number` on the `deliveryaddress` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `VarChar(40)`.
  - You are about to alter the column `neighborhood` on the `deliveryaddress` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `VarChar(40)`.
  - You are about to alter the column `complement` on the `deliveryaddress` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `VarChar(80)`.
  - You are about to alter the column `reference` on the `deliveryaddress` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `VarChar(80)`.
  - You are about to alter the column `postalCode` on the `deliveryaddress` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `VarChar(20)`.
  - You are about to drop the column `product` on the `enterprise` table. All the data in the column will be lost.
  - You are about to alter the column `name` on the `enterprise` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `VarChar(80)`.
  - You are about to alter the column `legalName` on the `enterprise` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `VarChar(80)`.
  - You are about to alter the column `taxId` on the `enterprise` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `VarChar(20)`.
  - You are about to alter the column `responsiblePerson` on the `enterprise` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `VarChar(40)`.
  - You are about to alter the column `stateRegistration` on the `enterprise` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `VarChar(40)`.
  - You are about to alter the column `cityRegistration` on the `enterprise` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `VarChar(40)`.
  - You are about to alter the column `neighborhood` on the `enterprise` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `VarChar(40)`.
  - You are about to alter the column `street` on the `enterprise` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `VarChar(40)`.
  - You are about to alter the column `number` on the `enterprise` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `VarChar(40)`.
  - You are about to alter the column `complement` on the `enterprise` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `VarChar(80)`.
  - You are about to alter the column `postalCode` on the `enterprise` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `VarChar(20)`.
  - You are about to alter the column `name` on the `person` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `VarChar(80)`.
  - You are about to alter the column `legalName` on the `person` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `VarChar(80)`.
  - You are about to alter the column `taxId` on the `person` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `VarChar(20)`.
  - You are about to alter the column `nationalId` on the `person` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `VarChar(20)`.
  - You are about to alter the column `neighborhood` on the `person` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `VarChar(80)`.
  - You are about to alter the column `street` on the `person` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `VarChar(80)`.
  - You are about to alter the column `number` on the `person` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `VarChar(40)`.
  - You are about to alter the column `complement` on the `person` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `VarChar(80)`.
  - You are about to alter the column `postalCode` on the `person` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `VarChar(20)`.
  - You are about to alter the column `email` on the `person` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `VarChar(40)`.
  - You are about to alter the column `phone` on the `person` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `VarChar(40)`.
  - You are about to alter the column `cellphone` on the `person` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `VarChar(40)`.
  - You are about to alter the column `name` on the `state` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `VarChar(40)`.
  - You are about to alter the column `password` on the `user` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `VarChar(80)`.

*/
-- AlterTable
ALTER TABLE `audit` MODIFY `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE `city` MODIFY `name` VARCHAR(60) NOT NULL;

-- AlterTable
ALTER TABLE `country` MODIFY `name` VARCHAR(40) NOT NULL;

-- AlterTable
ALTER TABLE `customer` MODIFY `contactName` VARCHAR(80) NULL,
    MODIFY `contactPhone` VARCHAR(20) NULL,
    MODIFY `contactEmail` VARCHAR(40) NULL,
    MODIFY `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    MODIFY `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE `deliveryaddress` MODIFY `label` VARCHAR(40) NULL,
    MODIFY `street` VARCHAR(80) NULL,
    MODIFY `number` VARCHAR(40) NULL,
    MODIFY `neighborhood` VARCHAR(40) NULL,
    MODIFY `complement` VARCHAR(80) NULL,
    MODIFY `reference` VARCHAR(80) NULL,
    MODIFY `postalCode` VARCHAR(20) NULL,
    MODIFY `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    MODIFY `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE `enterprise` DROP COLUMN `product`,
    ADD COLUMN `branch` ENUM('INDUSTRY') NOT NULL DEFAULT 'INDUSTRY',
    MODIFY `name` VARCHAR(80) NULL,
    MODIFY `legalName` VARCHAR(80) NULL,
    MODIFY `taxId` VARCHAR(20) NULL,
    MODIFY `responsiblePerson` VARCHAR(40) NULL,
    MODIFY `stateRegistration` VARCHAR(40) NULL,
    MODIFY `cityRegistration` VARCHAR(40) NULL,
    MODIFY `neighborhood` VARCHAR(40) NULL,
    MODIFY `street` VARCHAR(40) NULL,
    MODIFY `number` VARCHAR(40) NULL,
    MODIFY `complement` VARCHAR(80) NULL,
    MODIFY `postalCode` VARCHAR(20) NULL,
    MODIFY `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    MODIFY `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE `log` MODIFY `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE `person` MODIFY `name` VARCHAR(80) NULL,
    MODIFY `legalName` VARCHAR(80) NULL,
    MODIFY `taxId` VARCHAR(20) NULL,
    MODIFY `nationalId` VARCHAR(20) NULL,
    MODIFY `neighborhood` VARCHAR(80) NULL,
    MODIFY `street` VARCHAR(80) NULL,
    MODIFY `number` VARCHAR(40) NULL,
    MODIFY `complement` VARCHAR(80) NULL,
    MODIFY `postalCode` VARCHAR(20) NULL,
    MODIFY `email` VARCHAR(40) NULL,
    MODIFY `phone` VARCHAR(40) NULL,
    MODIFY `cellphone` VARCHAR(40) NULL,
    MODIFY `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    MODIFY `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE `state` MODIFY `name` VARCHAR(40) NOT NULL;

-- AlterTable
ALTER TABLE `token` ADD COLUMN `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    MODIFY `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE `user` MODIFY `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    MODIFY `password` VARCHAR(80) NOT NULL,
    MODIFY `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE `productDefinition` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `enterpriseId` INTEGER NOT NULL,
    `name` VARCHAR(40) NOT NULL,
    `description` VARCHAR(191) NULL,
    `type` ENUM('RAW_MATERIAL', 'FINISHED_PRODUCT', 'RESALE_PRODUCT', 'IN_PROCESS_PRODUCT', 'COMPONENT', 'CONSUMABLE_MATERIAL', 'PACKAGING_MATERIAL', 'BY_PRODUCT', 'RETURNED_PRODUCT') NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE INDEX `productDefinition_enterpriseId_name_key`(`enterpriseId`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `unity` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `enterpriseId` INTEGER NOT NULL,
    `simbol` VARCHAR(8) NOT NULL,
    `description` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

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
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `productInventory` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `enterpriseId` INTEGER NOT NULL,
    `productId` INTEGER NOT NULL,
    `costValue` DECIMAL(14, 6) NOT NULL,
    `saleValue` DECIMAL(14, 6) NOT NULL,
    `quantity` DECIMAL(14, 6) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE INDEX `productInventory_enterpriseId_productId_key`(`enterpriseId`, `productId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `productDefinition` ADD CONSTRAINT `productDefinition_enterpriseId_fkey` FOREIGN KEY (`enterpriseId`) REFERENCES `enterprise`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `unity` ADD CONSTRAINT `unity_enterpriseId_fkey` FOREIGN KEY (`enterpriseId`) REFERENCES `enterprise`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `product` ADD CONSTRAINT `product_enterpriseId_fkey` FOREIGN KEY (`enterpriseId`) REFERENCES `enterprise`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `product` ADD CONSTRAINT `product_productDefinitionId_fkey` FOREIGN KEY (`productDefinitionId`) REFERENCES `productDefinition`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `product` ADD CONSTRAINT `product_unityId_fkey` FOREIGN KEY (`unityId`) REFERENCES `unity`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `productInventory` ADD CONSTRAINT `productInventory_enterpriseId_fkey` FOREIGN KEY (`enterpriseId`) REFERENCES `enterprise`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `productInventory` ADD CONSTRAINT `productInventory_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `product`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
