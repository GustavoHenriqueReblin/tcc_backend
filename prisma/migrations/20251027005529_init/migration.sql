-- AddForeignKey
ALTER TABLE `token` ADD CONSTRAINT `token_enterpriseId_fkey` FOREIGN KEY (`enterpriseId`) REFERENCES `enterprise`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
