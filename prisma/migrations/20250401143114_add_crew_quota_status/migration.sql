/*
  Warnings:

  - You are about to drop the `CrewUsage` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `UsageRecord` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "CrewUsage" DROP CONSTRAINT "CrewUsage_usageRecordId_fkey";

-- DropForeignKey
ALTER TABLE "UsageRecord" DROP CONSTRAINT "UsageRecord_routerId_fkey";

-- DropTable
DROP TABLE "CrewUsage";

-- DropTable
DROP TABLE "UsageRecord";

-- CreateTable
CREATE TABLE "RouterConnection" (
    "id" TEXT NOT NULL,
    "wanRouterId" TEXT NOT NULL,
    "lanRouterId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RouterConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WanUsageRecord" (
    "id" TEXT NOT NULL,
    "routerId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "credit" INTEGER NOT NULL,
    "debit" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WanUsageRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LanUsageRecord" (
    "id" TEXT NOT NULL,
    "routerId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "credit" INTEGER NOT NULL,
    "debit" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LanUsageRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrewUsageRecord" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "credit" INTEGER NOT NULL,
    "debit" INTEGER NOT NULL,
    "quota" INTEGER NOT NULL,
    "status" "CrewStatus" NOT NULL DEFAULT 'DISCONNECTED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrewUsageRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RouterConnection_wanRouterId_lanRouterId_key" ON "RouterConnection"("wanRouterId", "lanRouterId");

-- CreateIndex
CREATE INDEX "WanUsageRecord_date_idx" ON "WanUsageRecord"("date");

-- CreateIndex
CREATE UNIQUE INDEX "WanUsageRecord_routerId_date_key" ON "WanUsageRecord"("routerId", "date");

-- CreateIndex
CREATE INDEX "LanUsageRecord_date_idx" ON "LanUsageRecord"("date");

-- CreateIndex
CREATE UNIQUE INDEX "LanUsageRecord_routerId_date_key" ON "LanUsageRecord"("routerId", "date");

-- CreateIndex
CREATE INDEX "CrewUsageRecord_date_idx" ON "CrewUsageRecord"("date");

-- CreateIndex
CREATE UNIQUE INDEX "CrewUsageRecord_username_date_key" ON "CrewUsageRecord"("username", "date");

-- AddForeignKey
ALTER TABLE "RouterConnection" ADD CONSTRAINT "RouterConnection_wanRouterId_fkey" FOREIGN KEY ("wanRouterId") REFERENCES "Router"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RouterConnection" ADD CONSTRAINT "RouterConnection_lanRouterId_fkey" FOREIGN KEY ("lanRouterId") REFERENCES "Router"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WanUsageRecord" ADD CONSTRAINT "WanUsageRecord_routerId_fkey" FOREIGN KEY ("routerId") REFERENCES "Router"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LanUsageRecord" ADD CONSTRAINT "LanUsageRecord_routerId_fkey" FOREIGN KEY ("routerId") REFERENCES "Router"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
