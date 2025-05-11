-- CreateTable
CREATE TABLE "UserHistorySnapshot" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "snapshotDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "accessLevel" "UserAccessLevel" NOT NULL DEFAULT 'USER',
    "autoCredit" BOOLEAN NOT NULL DEFAULT false,
    "dataCredit" BIGINT NOT NULL DEFAULT 0,
    "name" TEXT,
    "displayName" TEXT,
    "pending" "Pending" NOT NULL DEFAULT 'REGISTERED',
    "portalConnectedAt" TIMESTAMP(3),
    "timeCredit" BIGINT NOT NULL DEFAULT 0,

    CONSTRAINT "UserHistorySnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserHistorySnapshot_userId_snapshotDate_key" ON "UserHistorySnapshot"("userId", "snapshotDate");

-- AddForeignKey
ALTER TABLE "UserHistorySnapshot" ADD CONSTRAINT "UserHistorySnapshot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
