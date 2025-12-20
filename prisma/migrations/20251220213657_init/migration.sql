-- DropForeignKey
ALTER TABLE `person`
	DROP INDEX `person_enterpriseId_taxId_key`,
	ADD INDEX `person_enterpriseId_fkey` (`enterpriseId`);