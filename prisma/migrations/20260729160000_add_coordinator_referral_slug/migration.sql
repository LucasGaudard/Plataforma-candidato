ALTER TABLE "User" ADD COLUMN "coordinatorSlug" TEXT;

UPDATE "User"
SET "coordinatorSlug" = 'coordenador-' || "id"
WHERE "role" = 'COORDINATOR';

CREATE UNIQUE INDEX "User_coordinatorSlug_key" ON "User"("coordinatorSlug");
CREATE INDEX "User_coordinatorSlug_idx" ON "User"("coordinatorSlug");
