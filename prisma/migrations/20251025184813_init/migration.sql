/*
  Warnings:

  - Added the required column `enterpriseId` to the `token` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `log` ADD COLUMN `enterpriseId` INTEGER NULL;

-- AlterTable
ALTER TABLE `token` ADD COLUMN `enterpriseId` INTEGER NOT NULL;
