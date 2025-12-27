-- CreateTable
CREATE TABLE `warehouse` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `enterpriseId` INTEGER NOT NULL,
    `code` VARCHAR(20) NOT NULL,
    `name` VARCHAR(80) NOT NULL,
    `description` VARCHAR(120) NULL,

    UNIQUE INDEX `warehouse_enterpriseId_code_key`(`enterpriseId`, `code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `inventoryMovement` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `enterpriseId` INTEGER NOT NULL,
    `productId` INTEGER NOT NULL,
    `warehouseId` INTEGER NOT NULL,
    `lotId` INTEGER NULL,
    `direction` ENUM('IN', 'OUT') NOT NULL,
    `source` ENUM('PURCHASE', 'HARVEST', 'SALE', 'ADJUSTMENT') NOT NULL,
    `quantity` DECIMAL(14, 6) NOT NULL,
    `unitCost` DECIMAL(14, 6) NULL,
    `reference` VARCHAR(80) NULL,
    `notes` VARCHAR(191) NULL,
    `supplierId` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX `inventoryMovement_enterpriseId_productId_idx`(`enterpriseId`, `productId`),
    INDEX `inventoryMovement_warehouseId_idx`(`warehouseId`),
    INDEX `inventoryMovement_direction_idx`(`direction`),
    INDEX `inventoryMovement_source_idx`(`source`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `warehouse` ADD CONSTRAINT `warehouse_enterpriseId_fkey` FOREIGN KEY (`enterpriseId`) REFERENCES `enterprise`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventoryMovement` ADD CONSTRAINT `inventoryMovement_enterpriseId_fkey` FOREIGN KEY (`enterpriseId`) REFERENCES `enterprise`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventoryMovement` ADD CONSTRAINT `inventoryMovement_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `product`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventoryMovement` ADD CONSTRAINT `inventoryMovement_warehouseId_fkey` FOREIGN KEY (`warehouseId`) REFERENCES `warehouse`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventoryMovement` ADD CONSTRAINT `inventoryMovement_supplierId_fkey` FOREIGN KEY (`supplierId`) REFERENCES `supplier`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
