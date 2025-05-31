-- DropForeignKey
ALTER TABLE "LanInterface" DROP CONSTRAINT "LanInterface_interfaceId_fkey";

-- CreateIndex
CREATE INDEX "LanInterface_interfaceId_idx" ON "LanInterface"("interfaceId");
