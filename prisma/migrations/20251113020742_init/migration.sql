-- CreateTable
CREATE TABLE `lot` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `enterpriseId` INTEGER NOT NULL,
    `code` VARCHAR(40) NOT NULL,
    `productId` INTEGER NULL,
    `harvestDate` DATETIME(3) NULL,
    `expiration` DATETIME(3) NULL,
    `notes` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

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
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `recipeItem` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `enterpriseId` INTEGER NOT NULL,
    `recipeId` INTEGER NOT NULL,
    `productId` INTEGER NOT NULL,
    `quantity` DECIMAL(14, 6) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `productionOrder` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `enterpriseId` INTEGER NOT NULL,
    `code` VARCHAR(40) NOT NULL,
    `productId` INTEGER NOT NULL,
    `lotId` INTEGER NULL,
    `status` ENUM('PLANNED', 'RUNNING', 'FINISHED', 'CANCELED') NOT NULL DEFAULT 'PLANNED',
    `plannedQty` DECIMAL(14, 6) NOT NULL,
    `producedQty` DECIMAL(14, 6) NULL,
    `wasteQty` DECIMAL(14, 6) NULL,
    `startDate` DATETIME(3) NULL,
    `endDate` DATETIME(3) NULL,
    `notes` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE INDEX `productionOrder_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `productionOrderInput` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `enterpriseId` INTEGER NOT NULL,
    `productionOrderId` INTEGER NOT NULL,
    `productId` INTEGER NOT NULL,
    `quantity` DECIMAL(14, 6) NOT NULL,
    `unitCost` DECIMAL(14, 6) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `saleOrder` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `enterpriseId` INTEGER NOT NULL,
    `customerId` INTEGER NOT NULL,
    `code` VARCHAR(40) NOT NULL,
    `status` ENUM('PENDING', 'APPROVED', 'SHIPPED', 'RECEIVED', 'FINISHED', 'CANCELED') NOT NULL DEFAULT 'PENDING',
    `totalValue` DECIMAL(14, 6) NOT NULL,
    `notes` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE INDEX `saleOrder_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `saleOrderItem` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `enterpriseId` INTEGER NOT NULL,
    `saleOrderId` INTEGER NOT NULL,
    `productId` INTEGER NOT NULL,
    `quantity` DECIMAL(14, 6) NOT NULL,
    `unitPrice` DECIMAL(14, 6) NOT NULL,
    `productUnitPrice` DECIMAL(14, 6) NOT NULL,
    `unitCost` DECIMAL(14, 6) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `purchaseOrder` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `enterpriseId` INTEGER NOT NULL,
    `supplierId` INTEGER NOT NULL,
    `code` VARCHAR(40) NOT NULL,
    `status` ENUM('PENDING', 'APPROVED', 'SHIPPED', 'RECEIVED', 'FINISHED', 'CANCELED') NOT NULL DEFAULT 'PENDING',
    `notes` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE INDEX `purchaseOrder_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `purchaseOrderItem` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `enterpriseId` INTEGER NOT NULL,
    `purchaseOrderId` INTEGER NOT NULL,
    `productId` INTEGER NOT NULL,
    `quantity` DECIMAL(14, 6) NOT NULL,
    `unitCost` DECIMAL(14, 6) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `inventoryMovement` ADD CONSTRAINT `inventoryMovement_lotId_fkey` FOREIGN KEY (`lotId`) REFERENCES `lot`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lot` ADD CONSTRAINT `lot_enterpriseId_fkey` FOREIGN KEY (`enterpriseId`) REFERENCES `enterprise`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lot` ADD CONSTRAINT `lot_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `product`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `recipe` ADD CONSTRAINT `recipe_enterpriseId_fkey` FOREIGN KEY (`enterpriseId`) REFERENCES `enterprise`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `recipe` ADD CONSTRAINT `recipe_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `product`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `recipeItem` ADD CONSTRAINT `recipeItem_enterpriseId_fkey` FOREIGN KEY (`enterpriseId`) REFERENCES `enterprise`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `recipeItem` ADD CONSTRAINT `recipeItem_recipeId_fkey` FOREIGN KEY (`recipeId`) REFERENCES `recipe`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `recipeItem` ADD CONSTRAINT `recipeItem_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `product`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `productionOrder` ADD CONSTRAINT `productionOrder_enterpriseId_fkey` FOREIGN KEY (`enterpriseId`) REFERENCES `enterprise`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `productionOrder` ADD CONSTRAINT `productionOrder_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `product`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `productionOrder` ADD CONSTRAINT `productionOrder_lotId_fkey` FOREIGN KEY (`lotId`) REFERENCES `lot`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `productionOrderInput` ADD CONSTRAINT `productionOrderInput_enterpriseId_fkey` FOREIGN KEY (`enterpriseId`) REFERENCES `enterprise`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `productionOrderInput` ADD CONSTRAINT `productionOrderInput_productionOrderId_fkey` FOREIGN KEY (`productionOrderId`) REFERENCES `productionOrder`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `productionOrderInput` ADD CONSTRAINT `productionOrderInput_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `product`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `saleOrder` ADD CONSTRAINT `saleOrder_enterpriseId_fkey` FOREIGN KEY (`enterpriseId`) REFERENCES `enterprise`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `saleOrder` ADD CONSTRAINT `saleOrder_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `customer`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `saleOrderItem` ADD CONSTRAINT `saleOrderItem_enterpriseId_fkey` FOREIGN KEY (`enterpriseId`) REFERENCES `enterprise`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `saleOrderItem` ADD CONSTRAINT `saleOrderItem_saleOrderId_fkey` FOREIGN KEY (`saleOrderId`) REFERENCES `saleOrder`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `saleOrderItem` ADD CONSTRAINT `saleOrderItem_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `product`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `purchaseOrder` ADD CONSTRAINT `purchaseOrder_enterpriseId_fkey` FOREIGN KEY (`enterpriseId`) REFERENCES `enterprise`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `purchaseOrder` ADD CONSTRAINT `purchaseOrder_supplierId_fkey` FOREIGN KEY (`supplierId`) REFERENCES `supplier`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `purchaseOrderItem` ADD CONSTRAINT `purchaseOrderItem_enterpriseId_fkey` FOREIGN KEY (`enterpriseId`) REFERENCES `enterprise`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `purchaseOrderItem` ADD CONSTRAINT `purchaseOrderItem_purchaseOrderId_fkey` FOREIGN KEY (`purchaseOrderId`) REFERENCES `purchaseOrder`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `purchaseOrderItem` ADD CONSTRAINT `purchaseOrderItem_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `product`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
