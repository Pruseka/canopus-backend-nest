/*
  Warnings:

  - You are about to drop the column `pending` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `pending` on the `UserHistorySnapshot` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "Status" AS ENUM ('PENDING', 'ERROR', 'REGISTERED');

-- CreateEnum
CREATE TYPE "WanStatus" AS ENUM ('READY', 'ERROR', 'SUSPENDED', 'INITIALIZING', 'ALL_WAN_FORCED_OFF', 'NOT_READY', 'QUOTA_REACHED', 'ONLINE');

-- CreateEnum
CREATE TYPE "PrepaidUsageMode" AS ENUM ('DISALLOW', 'ALLOW', 'LIMITED');

-- CreateEnum
CREATE TYPE "DhcpStatus" AS ENUM ('ENABLED', 'DISABLED');

-- CreateEnum
CREATE TYPE "UsagePeriodType" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY');

-- CreateEnum
CREATE TYPE "UsageLimitStatus" AS ENUM ('NO_LIMIT', 'LIMIT_ENFORCED', 'LIMIT_DISABLED');

-- AlterTable
ALTER TABLE "User" DROP COLUMN "pending",
ADD COLUMN     "status" "Status" NOT NULL DEFAULT 'REGISTERED';

-- AlterTable
ALTER TABLE "UserHistorySnapshot" DROP COLUMN "pending",
ADD COLUMN     "status" "Status" NOT NULL DEFAULT 'REGISTERED';

-- DropEnum
DROP TYPE "Pending";

-- CreateTable
CREATE TABLE "Wan" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "wanId" TEXT NOT NULL,
    "wanName" TEXT NOT NULL,
    "wanStatus" "WanStatus" NOT NULL,
    "prepaidUsageMode" "PrepaidUsageMode" NOT NULL DEFAULT 'ALLOW',
    "dhcp" "DhcpStatus" NOT NULL DEFAULT 'ENABLED',
    "dns1" TEXT,
    "dns2" TEXT,
    "interfaceId" TEXT,
    "ipAddress" TEXT,
    "ipGateway" TEXT,
    "prepaidUsageMaxVolume" BIGINT,
    "prepaidUsagePeriodType" "UsagePeriodType",
    "subnetmask" TEXT,
    "switchPriority" INTEGER,
    "usageBlocked" BIGINT NOT NULL DEFAULT 0,
    "usageInBytes" BIGINT NOT NULL DEFAULT 0,
    "usageLimitStatus" "UsageLimitStatus" NOT NULL DEFAULT 'NO_LIMIT',
    "maxUsageInBytes" BIGINT,
    "usagePeriodInDays" INTEGER,
    "usagePeriodType" "UsagePeriodType",
    "usageStart" TIMESTAMP(3),
    "usageStartTimestamp" BIGINT,

    CONSTRAINT "Wan_pkey" PRIMARY KEY ("id")
);
