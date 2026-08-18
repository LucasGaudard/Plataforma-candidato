ALTER TABLE "Campaign" ADD COLUMN "whatsappInitialMessage" TEXT;

ALTER TABLE "User" ADD COLUMN "whatsappInitialMessageSentAt" TIMESTAMP(3);
