-- Add the global role without changing any existing role values.
ALTER TYPE "Role" ADD VALUE 'SUPER_ADMIN';

-- SUPER_ADMIN is global and has no campaign. Existing users keep their campaignId.
ALTER TABLE "User" ALTER COLUMN "campaignId" DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN "campaignId" DROP NOT NULL;
