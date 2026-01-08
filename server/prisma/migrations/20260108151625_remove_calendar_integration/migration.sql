/*
  Warnings:

  - You are about to drop the column `calendarSource` on the `Event` table. All the data in the column will be lost.
  - You are about to drop the column `googleEventId` on the `Event` table. All the data in the column will be lost.
  - You are about to drop the column `outlookEventId` on the `Event` table. All the data in the column will be lost.
  - You are about to drop the column `googleAccessToken` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `googleRefreshToken` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `googleTokenExpiry` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `lastCalendarSync` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `msAccessToken` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `msRefreshToken` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `msTokenExpiry` on the `User` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "Event_googleEventId_key";

-- DropIndex
DROP INDEX "Event_outlookEventId_key";

-- AlterTable
ALTER TABLE "Event" DROP COLUMN "calendarSource",
DROP COLUMN "googleEventId",
DROP COLUMN "outlookEventId";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "googleAccessToken",
DROP COLUMN "googleRefreshToken",
DROP COLUMN "googleTokenExpiry",
DROP COLUMN "lastCalendarSync",
DROP COLUMN "msAccessToken",
DROP COLUMN "msRefreshToken",
DROP COLUMN "msTokenExpiry";
