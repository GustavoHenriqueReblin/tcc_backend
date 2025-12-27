-- AlterTable
ALTER TABLE `inventorymovement` MODIFY `source` ENUM('PURCHASE', 'HARVEST', 'SALE', 'ADJUSTMENT', 'PRODUCTION') NOT NULL;

-- AlterTable
ALTER TABLE `productionorder` ADD COLUMN `warehouseId` INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE `productionOrder` ADD CONSTRAINT `productionOrder_warehouseId_fkey` FOREIGN KEY (`warehouseId`) REFERENCES `warehouse`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
