-- DropForeignKey
ALTER TABLE `inventorymovement` DROP FOREIGN KEY `inventorymovement_supplierId_fkey`;

-- DropIndex
DROP INDEX `inventorymovement_supplierId_fkey` ON `inventorymovement`;

-- AlterTable
ALTER TABLE `inventorymovement` 
  DROP COLUMN `supplierId`,
  ADD COLUMN `productionOrderId` INTEGER NULL AFTER lotId,
  ADD COLUMN `purchaseOrderId` INTEGER NULL AFTER productionOrderId,
  ADD COLUMN `saleOrderId` INTEGER NULL AFTER purchaseOrderId;

-- AddForeignKey
ALTER TABLE `inventorymovement` ADD CONSTRAINT `inventorymovement_purchaseOrderId_fkey` FOREIGN KEY (`purchaseOrderId`) REFERENCES `purchaseorder`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventorymovement` ADD CONSTRAINT `inventorymovement_saleOrderId_fkey` FOREIGN KEY (`saleOrderId`) REFERENCES `saleorder`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventorymovement` ADD CONSTRAINT `inventorymovement_productionOrderId_fkey` FOREIGN KEY (`productionOrderId`) REFERENCES `productionorder`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
