-- AlterTable
ALTER TABLE `saleorder` ADD COLUMN `warehouseId` INTEGER NOT NULL AFTER customerId;

-- AddForeignKey
ALTER TABLE `saleorder` ADD CONSTRAINT `saleorder_warehouseId_fkey` FOREIGN KEY (`warehouseId`) REFERENCES `warehouse`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
