/*
  Warnings:

  - Added the required column `updatedAt` to the `UserHistorySnapshot` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "UserHistorySnapshot" DROP CONSTRAINT "UserHistorySnapshot_userId_fkey";

-- AlterTable
ALTER TABLE "UserHistorySnapshot" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AddForeignKey
ALTER TABLE "UserHistorySnapshot" ADD CONSTRAINT "UserHistorySnapshot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
