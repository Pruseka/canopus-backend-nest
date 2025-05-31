-- CreateTable
CREATE TABLE "LanUsage" (
    "id" TEXT NOT NULL,
    "lanId" TEXT NOT NULL,
    "wanId" TEXT NOT NULL,
    "bytes" BIGINT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3),
    "snapshotDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LanUsage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LanUsage_lanId_startTime_idx" ON "LanUsage"("lanId", "startTime");

-- CreateIndex
CREATE INDEX "LanUsage_wanId_startTime_idx" ON "LanUsage"("wanId", "startTime");

-- CreateIndex
CREATE INDEX "LanUsage_snapshotDate_idx" ON "LanUsage"("snapshotDate");

-- AddForeignKey
ALTER TABLE "LanUsage" ADD CONSTRAINT "LanUsage_lanId_fkey" FOREIGN KEY ("lanId") REFERENCES "Lan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LanUsage" ADD CONSTRAINT "LanUsage_wanId_fkey" FOREIGN KEY ("wanId") REFERENCES "Wan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
