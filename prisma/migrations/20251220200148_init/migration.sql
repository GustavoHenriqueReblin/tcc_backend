-- AlterTable
ALTER TABLE `accountspayable` MODIFY `dueDate` DATE NOT NULL,
    MODIFY `paymentDate` DATE NULL;

-- AlterTable
ALTER TABLE `accountsreceivable` MODIFY `dueDate` DATE NOT NULL,
    MODIFY `paymentDate` DATE NULL;

-- AlterTable
ALTER TABLE `asset` MODIFY `acquisitionDate` DATE NOT NULL;

-- AlterTable
ALTER TABLE `assetmaintenance` MODIFY `date` DATE NOT NULL;

-- AlterTable
ALTER TABLE `lot` MODIFY `harvestDate` DATE NULL,
    MODIFY `expiration` DATE NULL;

-- AlterTable
ALTER TABLE `person` MODIFY `dateOfBirth` DATE NULL;
