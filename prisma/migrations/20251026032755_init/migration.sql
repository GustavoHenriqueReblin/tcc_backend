/*
  Warnings:

  - A unique constraint covering the columns `[taxId,countryId,stateId,cityId]` on the table `enterprise` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[enterpriseId,taxId]` on the table `person` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX `enterprise_taxId_key` ON `enterprise`;

-- DropIndex
DROP INDEX `person_taxId_key` ON `person`;

-- CreateIndex
CREATE UNIQUE INDEX `enterprise_taxId_countryId_stateId_cityId_key` ON `enterprise`(`taxId`, `countryId`, `stateId`, `cityId`);

-- CreateIndex
CREATE UNIQUE INDEX `person_enterpriseId_taxId_key` ON `person`(`enterpriseId`, `taxId`);
