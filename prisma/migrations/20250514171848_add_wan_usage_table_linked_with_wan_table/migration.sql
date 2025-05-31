-- CreateTable
CREATE TABLE "WanUsage" (
    "id" TEXT NOT NULL,
    "wanId" TEXT NOT NULL,
    "bytes" BIGINT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3),
    "maxBytes" BIGINT NOT NULL DEFAULT 0,
    "snapshotDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WanUsage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WanUsage_wanId_startTime_idx" ON "WanUsage"("wanId", "startTime");

-- CreateIndex
CREATE INDEX "WanUsage_snapshotDate_idx" ON "WanUsage"("snapshotDate");

-- AddForeignKey
ALTER TABLE "WanUsage" ADD CONSTRAINT "WanUsage_wanId_fkey" FOREIGN KEY ("wanId") REFERENCES "Wan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
