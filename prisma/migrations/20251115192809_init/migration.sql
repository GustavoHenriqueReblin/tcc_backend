-- CreateTable
CREATE TABLE `assetCategory` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `enterpriseId` INTEGER NOT NULL,
    `name` VARCHAR(40) NOT NULL,
    `description` VARCHAR(120) NULL,
    `createdAt` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` TIMESTAMP(3) NOT NULL,

    UNIQUE INDEX `assetCategory_enterpriseId_name_key`(`enterpriseId`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `asset` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `enterpriseId` INTEGER NOT NULL,
    `categoryId` INTEGER NOT NULL,
    `name` VARCHAR(80) NOT NULL,
    `acquisitionDate` DATETIME(3) NOT NULL,
    `acquisitionCost` DECIMAL(14, 6) NOT NULL,
    `usefulLifeMonths` INTEGER NOT NULL,
    `salvageValue` DECIMAL(14, 6) NOT NULL,
    `location` VARCHAR(80) NULL,
    `status` ENUM('ACTIVE', 'INACTIVE', 'SOLD', 'DISPOSED', 'LOST') NOT NULL DEFAULT 'ACTIVE',
    `notes` VARCHAR(191) NULL,
    `createdAt` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` TIMESTAMP(3) NOT NULL,

    INDEX `asset_enterpriseId_idx`(`enterpriseId`),
    INDEX `asset_categoryId_idx`(`categoryId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `assetMaintenance` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `enterpriseId` INTEGER NOT NULL,
    `assetId` INTEGER NOT NULL,
    `type` ENUM('CLEANING', 'LUBRICATION', 'ADJUSTMENT', 'PART_REPLACEMENT', 'INSPECTION', 'CORRECTIVE', 'PREVENTIVE', 'OTHER') NOT NULL DEFAULT 'OTHER',
    `description` VARCHAR(200) NULL,
    `cost` DECIMAL(14, 6) NULL,
    `date` DATETIME(3) NOT NULL,
    `technician` VARCHAR(80) NULL,
    `notes` VARCHAR(191) NULL,
    `createdAt` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` TIMESTAMP(3) NOT NULL,

    INDEX `assetMaintenance_enterpriseId_idx`(`enterpriseId`),
    INDEX `assetMaintenance_assetId_idx`(`assetId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `assetCategory` ADD CONSTRAINT `assetCategory_enterpriseId_fkey` FOREIGN KEY (`enterpriseId`) REFERENCES `enterprise`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `asset` ADD CONSTRAINT `asset_enterpriseId_fkey` FOREIGN KEY (`enterpriseId`) REFERENCES `enterprise`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `asset` ADD CONSTRAINT `asset_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `assetCategory`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `assetMaintenance` ADD CONSTRAINT `assetMaintenance_enterpriseId_fkey` FOREIGN KEY (`enterpriseId`) REFERENCES `enterprise`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `assetMaintenance` ADD CONSTRAINT `assetMaintenance_assetId_fkey` FOREIGN KEY (`assetId`) REFERENCES `asset`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
