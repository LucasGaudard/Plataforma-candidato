-- Add nullable campaign references before backfilling existing records.
ALTER TABLE "Post" ADD COLUMN "campaignId" TEXT;
ALTER TABLE "Event" ADD COLUMN "campaignId" TEXT;
ALTER TABLE "Live" ADD COLUMN "campaignId" TEXT;
ALTER TABLE "Notification" ADD COLUMN "campaignId" TEXT;

-- Backfill all existing content with the current Paula Quintanilha campaign.
UPDATE "Post"
SET "campaignId" = 'cm5paulaquintanilha000001'
WHERE "campaignId" IS NULL;

UPDATE "Event"
SET "campaignId" = 'cm5paulaquintanilha000001'
WHERE "campaignId" IS NULL;

UPDATE "Live"
SET "campaignId" = 'cm5paulaquintanilha000001'
WHERE "campaignId" IS NULL;

UPDATE "Notification"
SET "campaignId" = 'cm5paulaquintanilha000001'
WHERE "campaignId" IS NULL;

-- Make campaign ownership mandatory after every existing row is linked.
ALTER TABLE "Post" ALTER COLUMN "campaignId" SET NOT NULL;
ALTER TABLE "Event" ALTER COLUMN "campaignId" SET NOT NULL;
ALTER TABLE "Live" ALTER COLUMN "campaignId" SET NOT NULL;
ALTER TABLE "Notification" ALTER COLUMN "campaignId" SET NOT NULL;

-- Create indexes used by tenant-scoped queries.
CREATE INDEX "Post_campaignId_idx" ON "Post"("campaignId");
CREATE INDEX "Event_campaignId_idx" ON "Event"("campaignId");
CREATE INDEX "Live_campaignId_idx" ON "Live"("campaignId");
CREATE INDEX "Notification_campaignId_idx" ON "Notification"("campaignId");

-- Prevent campaign deletion while related content still exists.
ALTER TABLE "Post"
ADD CONSTRAINT "Post_campaignId_fkey"
FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Event"
ADD CONSTRAINT "Event_campaignId_fkey"
FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Live"
ADD CONSTRAINT "Live_campaignId_fkey"
FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Notification"
ADD CONSTRAINT "Notification_campaignId_fkey"
FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
