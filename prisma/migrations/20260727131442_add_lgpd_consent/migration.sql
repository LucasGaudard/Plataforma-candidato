-- AlterTable
ALTER TABLE "User" ADD COLUMN     "lgpdConsent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lgpdConsentAt" TIMESTAMP(3),
ADD COLUMN     "lgpdConsentText" TEXT,
ADD COLUMN     "lgpdConsentVersion" TEXT;
