CREATE TYPE "WhatsAppConnectionStatus" AS ENUM ('NOT_TESTED', 'CONNECTED', 'ERROR');
CREATE TYPE "WhatsAppMessageDirection" AS ENUM ('OUTBOUND', 'INBOUND');
CREATE TYPE "WhatsAppMessageStatus" AS ENUM ('QUEUED', 'SENT', 'DELIVERED', 'READ', 'FAILED', 'RECEIVED');

CREATE TABLE "CampaignWhatsAppConfig" (
  "id" TEXT NOT NULL,
  "campaignId" TEXT NOT NULL,
  "phoneNumberId" TEXT NOT NULL,
  "businessAccountId" TEXT NOT NULL,
  "displayPhoneNumber" TEXT,
  "accessTokenEncrypted" TEXT NOT NULL,
  "apiVersion" TEXT NOT NULL DEFAULT 'v25.0',
  "enabled" BOOLEAN NOT NULL DEFAULT false,
  "connectionStatus" "WhatsAppConnectionStatus" NOT NULL DEFAULT 'NOT_TESTED',
  "lastConnectionAt" TIMESTAMP(3),
  "lastConnectionError" TEXT,
  "lastTestMessageAt" TIMESTAMP(3),
  "lastWebhookAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CampaignWhatsAppConfig_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WhatsAppMessage" (
  "id" TEXT NOT NULL,
  "campaignId" TEXT NOT NULL,
  "metaMessageId" TEXT,
  "recipient" TEXT NOT NULL,
  "direction" "WhatsAppMessageDirection" NOT NULL,
  "type" TEXT NOT NULL,
  "status" "WhatsAppMessageStatus" NOT NULL,
  "templateName" TEXT,
  "errorCode" TEXT,
  "errorMessage" TEXT,
  "sentByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WhatsAppMessage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CampaignWhatsAppConfig_campaignId_key" ON "CampaignWhatsAppConfig"("campaignId");
CREATE UNIQUE INDEX "CampaignWhatsAppConfig_phoneNumberId_key" ON "CampaignWhatsAppConfig"("phoneNumberId");
CREATE UNIQUE INDEX "WhatsAppMessage_metaMessageId_key" ON "WhatsAppMessage"("metaMessageId");
CREATE INDEX "WhatsAppMessage_campaignId_createdAt_idx" ON "WhatsAppMessage"("campaignId", "createdAt");
CREATE INDEX "WhatsAppMessage_campaignId_recipient_idx" ON "WhatsAppMessage"("campaignId", "recipient");

ALTER TABLE "CampaignWhatsAppConfig" ADD CONSTRAINT "CampaignWhatsAppConfig_campaignId_fkey"
  FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WhatsAppMessage" ADD CONSTRAINT "WhatsAppMessage_campaignId_fkey"
  FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
