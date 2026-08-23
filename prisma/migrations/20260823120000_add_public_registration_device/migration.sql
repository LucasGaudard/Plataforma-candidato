CREATE TABLE "PublicRegistrationDevice" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "deviceHash" TEXT NOT NULL,
    "supporterId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PublicRegistrationDevice_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PublicRegistrationDevice_supporterId_key" ON "PublicRegistrationDevice"("supporterId");
CREATE UNIQUE INDEX "PublicRegistrationDevice_campaignId_deviceHash_key" ON "PublicRegistrationDevice"("campaignId", "deviceHash");
CREATE INDEX "PublicRegistrationDevice_campaignId_createdAt_idx" ON "PublicRegistrationDevice"("campaignId", "createdAt");

ALTER TABLE "PublicRegistrationDevice" ADD CONSTRAINT "PublicRegistrationDevice_campaignId_fkey"
FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PublicRegistrationDevice" ADD CONSTRAINT "PublicRegistrationDevice_supporterId_fkey"
FOREIGN KEY ("supporterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
