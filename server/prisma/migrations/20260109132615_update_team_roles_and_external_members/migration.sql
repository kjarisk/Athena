/*
  Warnings:

  - Added the required column `updatedAt` to the `TeamMember` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "TeamRole" ADD VALUE 'PROJECT_LEADER';
ALTER TYPE "TeamRole" ADD VALUE 'PRODUCT_OWNER';
ALTER TYPE "TeamRole" ADD VALUE 'REFINEMENT_LEADER';
ALTER TYPE "TeamRole" ADD VALUE 'FULLSTACK';

-- AlterTable
ALTER TABLE "TeamMember" ADD COLUMN     "email" TEXT,
ADD COLUMN     "isExternal" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "name" TEXT,
ADD COLUMN     "secondaryRole" "TeamRole",
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "employeeId" DROP NOT NULL;
