-- AlterTable
ALTER TABLE `saleorder`
    ADD COLUMN `discount` DECIMAL(14, 6) NOT NULL DEFAULT 0 AFTER `totalValue`,
    ADD COLUMN `otherCosts` DECIMAL(14, 6) NOT NULL DEFAULT 0 AFTER `discount`;
