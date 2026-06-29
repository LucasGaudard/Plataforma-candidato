-- CreateEnum
CREATE TYPE "WhatsappStatus" AS ENUM ('PENDING', 'SENT', 'CONFIRMED', 'FAILED', 'OPT_OUT');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "whatsappConfirmedAt" TIMESTAMP(3),
ADD COLUMN     "whatsappError" TEXT,
ADD COLUMN     "whatsappLastResponse" TEXT,
ADD COLUMN     "whatsappLastSent" TIMESTAMP(3),
ADD COLUMN     "whatsappStatus" "WhatsappStatus" NOT NULL DEFAULT 'PENDING';
