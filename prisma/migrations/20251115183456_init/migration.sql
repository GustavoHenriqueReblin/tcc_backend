-- CreateTable
CREATE TABLE `accountsReceivable` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `enterpriseId` INTEGER NOT NULL,
    `customerId` INTEGER NULL,
    `saleOrderId` INTEGER NULL,
    `description` VARCHAR(120) NULL,
    `value` DECIMAL(14, 6) NOT NULL,
    `dueDate` DATETIME(3) NOT NULL,
    `paymentDate` DATETIME(3) NULL,
    `method` ENUM('CASH', 'PIX', 'CARD', 'BANK_SLIP', 'TRANSFER', 'OTHER') NULL,
    `status` ENUM('PENDING', 'PAID', 'OVERDUE', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    `notes` VARCHAR(191) NULL,
    `createdAt` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` TIMESTAMP(3) NOT NULL,

    INDEX `accountsReceivable_enterpriseId_idx`(`enterpriseId`),
    INDEX `accountsReceivable_customerId_idx`(`customerId`),
    INDEX `accountsReceivable_saleOrderId_idx`(`saleOrderId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `accountsPayable` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `enterpriseId` INTEGER NOT NULL,
    `supplierId` INTEGER NULL,
    `purchaseOrderId` INTEGER NULL,
    `description` VARCHAR(120) NULL,
    `value` DECIMAL(14, 6) NOT NULL,
    `dueDate` DATETIME(3) NOT NULL,
    `paymentDate` DATETIME(3) NULL,
    `method` ENUM('CASH', 'PIX', 'CARD', 'BANK_SLIP', 'TRANSFER', 'OTHER') NULL,
    `status` ENUM('PENDING', 'PAID', 'OVERDUE', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    `notes` VARCHAR(191) NULL,
    `createdAt` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` TIMESTAMP(3) NOT NULL,

    INDEX `accountsPayable_enterpriseId_idx`(`enterpriseId`),
    INDEX `accountsPayable_supplierId_idx`(`supplierId`),
    INDEX `accountsPayable_purchaseOrderId_idx`(`purchaseOrderId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `financialTransaction` (
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
    `createdAt` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` TIMESTAMP(3) NOT NULL,

    INDEX `financialTransaction_enterpriseId_idx`(`enterpriseId`),
    INDEX `financialTransaction_accountsReceivableId_idx`(`accountsReceivableId`),
    INDEX `financialTransaction_accountsPayableId_idx`(`accountsPayableId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `accountsReceivable` ADD CONSTRAINT `accountsReceivable_enterpriseId_fkey` FOREIGN KEY (`enterpriseId`) REFERENCES `enterprise`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `accountsReceivable` ADD CONSTRAINT `accountsReceivable_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `customer`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `accountsReceivable` ADD CONSTRAINT `accountsReceivable_saleOrderId_fkey` FOREIGN KEY (`saleOrderId`) REFERENCES `saleOrder`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `accountsPayable` ADD CONSTRAINT `accountsPayable_enterpriseId_fkey` FOREIGN KEY (`enterpriseId`) REFERENCES `enterprise`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `accountsPayable` ADD CONSTRAINT `accountsPayable_supplierId_fkey` FOREIGN KEY (`supplierId`) REFERENCES `supplier`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `accountsPayable` ADD CONSTRAINT `accountsPayable_purchaseOrderId_fkey` FOREIGN KEY (`purchaseOrderId`) REFERENCES `purchaseOrder`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `financialTransaction` ADD CONSTRAINT `financialTransaction_enterpriseId_fkey` FOREIGN KEY (`enterpriseId`) REFERENCES `enterprise`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `financialTransaction` ADD CONSTRAINT `financialTransaction_accountsReceivableId_fkey` FOREIGN KEY (`accountsReceivableId`) REFERENCES `accountsReceivable`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `financialTransaction` ADD CONSTRAINT `financialTransaction_accountsPayableId_fkey` FOREIGN KEY (`accountsPayableId`) REFERENCES `accountsPayable`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
