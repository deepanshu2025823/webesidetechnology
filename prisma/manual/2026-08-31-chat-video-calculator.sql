-- AlterTable
ALTER TABLE `SiteSettings` ADD COLUMN `videoEnabled` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `videoPerRow` INTEGER NOT NULL DEFAULT 3,
    ADD COLUMN `videoSubtitle` VARCHAR(400) NOT NULL DEFAULT '',
    ADD COLUMN `videoTitle` VARCHAR(200) NOT NULL DEFAULT 'Work in motion';

-- CreateTable
CREATE TABLE `VideoSlide` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(200) NOT NULL DEFAULT '',
    `description` TEXT NULL,
    `url` VARCHAR(600) NOT NULL,
    `thumbnail` VARCHAR(600) NOT NULL DEFAULT '',
    `order` INTEGER NOT NULL DEFAULT 0,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `VideoSlide_isActive_order_idx`(`isActive`, `order`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ChatSession` (
    `id` VARCHAR(191) NOT NULL,
    `token` VARCHAR(64) NOT NULL,
    `visitorName` VARCHAR(160) NOT NULL DEFAULT '',
    `visitorEmail` VARCHAR(190) NOT NULL DEFAULT '',
    `visitorPhone` VARCHAR(60) NOT NULL DEFAULT '',
    `status` ENUM('BOT', 'WAITING_AGENT', 'WITH_AGENT', 'CLOSED') NOT NULL DEFAULT 'BOT',
    `agentId` VARCHAR(191) NULL,
    `pageUrl` VARCHAR(500) NOT NULL DEFAULT '',
    `ipAddress` VARCHAR(60) NOT NULL DEFAULT '',
    `handoffAt` DATETIME(3) NULL,
    `closedAt` DATETIME(3) NULL,
    `lastMessageAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `unreadForAgent` INTEGER NOT NULL DEFAULT 0,
    `leadId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ChatSession_token_key`(`token`),
    INDEX `ChatSession_status_lastMessageAt_idx`(`status`, `lastMessageAt`),
    INDEX `ChatSession_agentId_idx`(`agentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ChatMessage` (
    `id` VARCHAR(191) NOT NULL,
    `sessionId` VARCHAR(191) NOT NULL,
    `role` ENUM('VISITOR', 'BOT', 'AGENT') NOT NULL,
    `body` TEXT NOT NULL,
    `authorId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ChatMessage_sessionId_createdAt_idx`(`sessionId`, `createdAt`),
    INDEX `ChatMessage_authorId_idx`(`authorId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CalculatorGroup` (
    `id` VARCHAR(191) NOT NULL,
    `label` VARCHAR(200) NOT NULL,
    `help` VARCHAR(400) NOT NULL DEFAULT '',
    `kind` ENUM('SINGLE', 'MULTI', 'QUANTITY', 'TOGGLE') NOT NULL DEFAULT 'SINGLE',
    `required` BOOLEAN NOT NULL DEFAULT false,
    `order` INTEGER NOT NULL DEFAULT 0,
    `isActive` BOOLEAN NOT NULL DEFAULT true,

    INDEX `CalculatorGroup_isActive_order_idx`(`isActive`, `order`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CalculatorOption` (
    `id` VARCHAR(191) NOT NULL,
    `groupId` VARCHAR(191) NOT NULL,
    `label` VARCHAR(200) NOT NULL,
    `help` VARCHAR(400) NOT NULL DEFAULT '',
    `price` INTEGER NOT NULL DEFAULT 0,
    `percent` INTEGER NOT NULL DEFAULT 100,
    `order` INTEGER NOT NULL DEFAULT 0,
    `isDefault` BOOLEAN NOT NULL DEFAULT false,

    INDEX `CalculatorOption_groupId_order_idx`(`groupId`, `order`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CalculatorSettings` (
    `id` INTEGER NOT NULL DEFAULT 1,
    `isEnabled` BOOLEAN NOT NULL DEFAULT true,
    `heading` VARCHAR(200) NOT NULL DEFAULT 'Project cost calculator',
    `subheading` TEXT NOT NULL,
    `basePrice` INTEGER NOT NULL DEFAULT 0,
    `taxPercent` INTEGER NOT NULL DEFAULT 18,
    `variancePct` INTEGER NOT NULL DEFAULT 15,
    `ctaLabel` VARCHAR(120) NOT NULL DEFAULT 'Email me this estimate',
    `disclaimer` TEXT NOT NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

