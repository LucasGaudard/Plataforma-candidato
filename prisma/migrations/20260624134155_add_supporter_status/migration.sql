-- CreateEnum
CREATE TYPE "SupporterStatus" AS ENUM ('PENDING', 'VERIFIED', 'INVALID');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "status" "SupporterStatus" NOT NULL DEFAULT 'PENDING';
