-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'COORDINATOR';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "coordinatorId" TEXT;

-- CreateIndex
CREATE INDEX "User_coordinatorId_idx" ON "User"("coordinatorId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_coordinatorId_fkey" FOREIGN KEY ("coordinatorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
