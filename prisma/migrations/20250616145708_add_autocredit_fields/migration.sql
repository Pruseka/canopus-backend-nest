-- CreateEnum
CREATE TYPE "AutocreditDefinition" AS ENUM ('NOT_FOUND', 'USER', 'SITE', 'SITE_GROUP');

-- CreateEnum
CREATE TYPE "AutocreditInterval" AS ENUM ('MONTHLY', 'WEEKLY', 'DAILY');

-- CreateEnum
CREATE TYPE "AutocreditType" AS ENUM ('ADD_VALUE', 'SET_TO_VALUE');

-- CreateEnum
CREATE TYPE "AutocreditStatus" AS ENUM ('DISABLED', 'ENABLED');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "autocreditDefinition" "AutocreditDefinition" DEFAULT 'NOT_FOUND',
ADD COLUMN     "autocreditInterval" "AutocreditInterval" DEFAULT 'MONTHLY',
ADD COLUMN     "autocreditLastTopup" TIMESTAMP(3),
ADD COLUMN     "autocreditStatus" "AutocreditStatus" DEFAULT 'DISABLED',
ADD COLUMN     "autocreditType" "AutocreditType" DEFAULT 'ADD_VALUE',
ADD COLUMN     "autocreditValue" BIGINT DEFAULT 0;

-- AlterTable
ALTER TABLE "UserHistorySnapshot" ADD COLUMN     "autocreditDefinition" "AutocreditDefinition" DEFAULT 'NOT_FOUND',
ADD COLUMN     "autocreditInterval" "AutocreditInterval" DEFAULT 'MONTHLY',
ADD COLUMN     "autocreditLastTopup" TIMESTAMP(3),
ADD COLUMN     "autocreditStatus" "AutocreditStatus" DEFAULT 'DISABLED',
ADD COLUMN     "autocreditType" "AutocreditType" DEFAULT 'ADD_VALUE',
ADD COLUMN     "autocreditValue" BIGINT DEFAULT 0;
