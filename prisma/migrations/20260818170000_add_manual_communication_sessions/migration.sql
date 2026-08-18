CREATE TYPE "ManualCommunicationSessionStatus" AS ENUM ('ACTIVE', 'PAUSED', 'COMPLETED');
CREATE TYPE "ManualCommunicationRecipientStatus" AS ENUM ('PENDING', 'SENT', 'SKIPPED', 'OPT_OUT');

CREATE TABLE "ManualCommunicationSession" (
  "id" TEXT NOT NULL,
  "campaignId" TEXT NOT NULL,
  "createdByUserId" TEXT NOT NULL,
  "createdByName" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "filters" JSONB NOT NULL,
  "requestedQuantity" INTEGER NOT NULL,
  "status" "ManualCommunicationSessionStatus" NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ManualCommunicationSession_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ManualCommunicationRecipient" (
  "id" TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "supporterId" TEXT NOT NULL,
  "supporterName" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "status" "ManualCommunicationRecipientStatus" NOT NULL DEFAULT 'PENDING',
  "sentAt" TIMESTAMP(3),
  "skippedAt" TIMESTAMP(3),
  "optOutAt" TIMESTAMP(3),
  "updatedByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ManualCommunicationRecipient_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ManualCommunicationSession_campaignId_createdAt_idx" ON "ManualCommunicationSession"("campaignId", "createdAt");
CREATE INDEX "ManualCommunicationSession_createdByUserId_createdAt_idx" ON "ManualCommunicationSession"("createdByUserId", "createdAt");
CREATE INDEX "ManualCommunicationRecipient_sessionId_status_idx" ON "ManualCommunicationRecipient"("sessionId", "status");
CREATE UNIQUE INDEX "ManualCommunicationRecipient_sessionId_supporterId_key" ON "ManualCommunicationRecipient"("sessionId", "supporterId");
ALTER TABLE "ManualCommunicationSession" ADD CONSTRAINT "ManualCommunicationSession_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ManualCommunicationRecipient" ADD CONSTRAINT "ManualCommunicationRecipient_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ManualCommunicationSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
