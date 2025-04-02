-- CreateEnum
CREATE TYPE "RouterType" AS ENUM ('WAN', 'LAN');

-- CreateEnum
CREATE TYPE "RouterCategory" AS ENUM ('GEO', 'L_BAND', 'MOBILE', 'BUSINESS', 'CREW', 'OT', 'OTHER');

-- CreateEnum
CREATE TYPE "RouterStatus" AS ENUM ('ACTIVE', 'STANDBY', 'INACTIVE');

-- CreateEnum
CREATE TYPE "CrewStatus" AS ENUM ('CONNECTED', 'DISCONNECTED');

-- CreateTable
CREATE TABLE "Router" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "RouterType" NOT NULL,
    "category" "RouterCategory",
    "maxCapacity" INTEGER NOT NULL,
    "status" "RouterStatus" NOT NULL DEFAULT 'INACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Router_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UsageRecord" (
    "id" TEXT NOT NULL,
    "routerId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "totalCredit" INTEGER NOT NULL,
    "totalDebit" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UsageRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrewUsage" (
    "id" TEXT NOT NULL,
    "usageRecordId" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "credit" INTEGER NOT NULL,
    "debit" INTEGER NOT NULL,
    "status" "CrewStatus" NOT NULL DEFAULT 'DISCONNECTED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrewUsage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Router_name_key" ON "Router"("name");

-- CreateIndex
CREATE INDEX "UsageRecord_date_idx" ON "UsageRecord"("date");

-- CreateIndex
CREATE UNIQUE INDEX "UsageRecord_routerId_date_key" ON "UsageRecord"("routerId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "CrewUsage_usageRecordId_username_key" ON "CrewUsage"("usageRecordId", "username");

-- AddForeignKey
ALTER TABLE "UsageRecord" ADD CONSTRAINT "UsageRecord_routerId_fkey" FOREIGN KEY ("routerId") REFERENCES "Router"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrewUsage" ADD CONSTRAINT "CrewUsage_usageRecordId_fkey" FOREIGN KEY ("usageRecordId") REFERENCES "UsageRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
