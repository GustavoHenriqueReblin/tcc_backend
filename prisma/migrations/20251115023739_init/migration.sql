/*
  Warnings:

  - Added the required column `updatedAt` to the `productionOrderInput` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `purchaseOrderItem` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `recipeItem` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `saleOrderItem` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `audit` MODIFY `createdAt` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3);

-- AlterTable
ALTER TABLE `customer` MODIFY `createdAt` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    MODIFY `updatedAt` TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE `deliveryaddress` MODIFY `createdAt` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    MODIFY `updatedAt` TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE `enterprise` MODIFY `createdAt` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    MODIFY `updatedAt` TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE `inventorymovement` MODIFY `createdAt` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    MODIFY `updatedAt` TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE `log` MODIFY `createdAt` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3);

-- AlterTable
ALTER TABLE `lot` MODIFY `createdAt` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    MODIFY `updatedAt` TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE `person` MODIFY `createdAt` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    MODIFY `updatedAt` TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE `product` MODIFY `createdAt` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    MODIFY `updatedAt` TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE `productdefinition` MODIFY `createdAt` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    MODIFY `updatedAt` TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE `productinventory` MODIFY `createdAt` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    MODIFY `updatedAt` TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE `productionorder` MODIFY `createdAt` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    MODIFY `updatedAt` TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE `productionorderinput` ADD COLUMN `createdAt` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `updatedAt` TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE `purchaseorder` MODIFY `createdAt` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    MODIFY `updatedAt` TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE `purchaseorderitem` ADD COLUMN `createdAt` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `updatedAt` TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE `recipe` MODIFY `createdAt` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    MODIFY `updatedAt` TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE `recipeitem` ADD COLUMN `createdAt` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `updatedAt` TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE `saleorder` MODIFY `createdAt` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    MODIFY `updatedAt` TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE `saleorderitem` ADD COLUMN `createdAt` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `updatedAt` TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE `supplier` MODIFY `createdAt` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    MODIFY `updatedAt` TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE `token` MODIFY `createdAt` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    MODIFY `updatedAt` TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE `unity` MODIFY `createdAt` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    MODIFY `updatedAt` TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE `user` MODIFY `createdAt` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    MODIFY `updatedAt` TIMESTAMP(3) NOT NULL;
