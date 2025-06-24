/*
  Warnings:

  - You are about to drop the column `lanId` on the `Lan` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "Lan_lanId_key";

-- AlterTable
ALTER TABLE "Lan" DROP COLUMN "lanId";
