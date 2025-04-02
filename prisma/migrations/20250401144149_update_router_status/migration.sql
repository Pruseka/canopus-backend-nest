-- AlterEnum
ALTER TYPE "RouterCategory" ADD VALUE 'LEO';

-- AlterTable
ALTER TABLE "Router" ALTER COLUMN "status" DROP NOT NULL,
ALTER COLUMN "status" DROP DEFAULT;
