-- CreateEnum
CREATE TYPE "CampaignStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED');

-- CreateTable
CREATE TABLE "Campaign" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "candidateName" TEXT NOT NULL,
    "party" TEXT,
    "logoUrl" TEXT,
    "primaryColor" TEXT,
    "secondaryColor" TEXT,
    "whatsappNumber" TEXT,
    "status" "CampaignStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

-- Seed the current campaign before making User.campaignId required.
INSERT INTO "Campaign" (
    "id",
    "name",
    "slug",
    "candidateName",
    "status",
    "createdAt",
    "updatedAt"
)
VALUES (
    'cm5paulaquintanilha000001',
    'Paula Quintanilha',
    'paula-quintanilha',
    'Paula Quintanilha',
    'ACTIVE',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);

-- Backfill every existing user and keep existing creation flows compatible.
ALTER TABLE "User"
ADD COLUMN "campaignId" TEXT NOT NULL DEFAULT 'cm5paulaquintanilha000001';

-- CreateIndex
CREATE UNIQUE INDEX "Campaign_slug_key" ON "Campaign"("slug");

-- CreateIndex
CREATE INDEX "Campaign_status_idx" ON "Campaign"("status");

-- CreateIndex
CREATE INDEX "Campaign_createdAt_idx" ON "Campaign"("createdAt");

-- CreateIndex
CREATE INDEX "User_campaignId_idx" ON "User"("campaignId");

-- AddForeignKey
ALTER TABLE "User"
ADD CONSTRAINT "User_campaignId_fkey"
FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
