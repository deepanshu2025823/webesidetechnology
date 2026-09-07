-- Invoice/quotation billing details.
--
-- 1. The owner's legal + banking identity moves onto the settings row so every
--    printed document fetches the current bank / UPI / QR details.
-- 2. Line items carry a billing cycle so the client can see whether a service
--    is one-time or recurring, and how often.

-- AlterTable
ALTER TABLE `SiteSettings`
    ADD COLUMN `gstin` VARCHAR(40) NOT NULL DEFAULT '',
    ADD COLUMN `pan` VARCHAR(20) NOT NULL DEFAULT '',
    ADD COLUMN `bankAccountName` VARCHAR(190) NOT NULL DEFAULT '',
    ADD COLUMN `bankName` VARCHAR(190) NOT NULL DEFAULT '',
    ADD COLUMN `bankAccountNumber` VARCHAR(60) NOT NULL DEFAULT '',
    ADD COLUMN `bankIfsc` VARCHAR(20) NOT NULL DEFAULT '',
    ADD COLUMN `bankBranch` VARCHAR(190) NOT NULL DEFAULT '',
    ADD COLUMN `upiId` VARCHAR(190) NOT NULL DEFAULT '',
    ADD COLUMN `upiQr` VARCHAR(500) NOT NULL DEFAULT '',
    ADD COLUMN `paymentNote` VARCHAR(400) NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE `InvoiceItem`
    ADD COLUMN `billingCycle` ENUM('ONE_TIME', 'MONTHLY', 'QUARTERLY', 'HALF_YEARLY', 'ANNUAL') NOT NULL DEFAULT 'ONE_TIME';

-- AlterTable
ALTER TABLE `QuotationItem`
    ADD COLUMN `billingCycle` ENUM('ONE_TIME', 'MONTHLY', 'QUARTERLY', 'HALF_YEARLY', 'ANNUAL') NOT NULL DEFAULT 'ONE_TIME';
