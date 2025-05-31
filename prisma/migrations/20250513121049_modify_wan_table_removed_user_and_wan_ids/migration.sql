/*
  Warnings:

  - You are about to drop the column `userId` on the `Wan` table. All the data in the column will be lost.
  - You are about to drop the column `wanId` on the `Wan` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Wan" DROP COLUMN "userId",
DROP COLUMN "wanId";
