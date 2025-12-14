/*
  Warnings:

  - Added the required column `recipeId` to the `productionOrder` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `productionorder` DROP FOREIGN KEY `productionOrder_productId_fkey`;

-- DropIndex
DROP INDEX `productionOrder_productId_fkey` ON `productionorder`;

-- AlterTable
ALTER TABLE `productionorder` ADD COLUMN `recipeId` INTEGER NOT NULL,
    MODIFY `productId` INTEGER NULL;

-- AddForeignKey
ALTER TABLE `productionOrder` ADD CONSTRAINT `productionOrder_recipeId_fkey` FOREIGN KEY (`recipeId`) REFERENCES `recipe`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `productionOrder` ADD CONSTRAINT `productionOrder_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `product`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
