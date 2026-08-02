CREATE TYPE "CityZone" AS ENUM ('WEST', 'NORTH', 'SOUTH', 'EAST', 'OTHER');

ALTER TABLE "User" ADD COLUMN "zone" "CityZone";

CREATE INDEX "User_zone_idx" ON "User"("zone");
