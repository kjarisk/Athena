-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "calendarSource" TEXT,
ADD COLUMN     "googleEventId" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "googleAccessToken" TEXT,
ADD COLUMN     "googleRefreshToken" TEXT,
ADD COLUMN     "googleTokenExpiry" TIMESTAMP(3),
ADD COLUMN     "isAdmin" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lastCalendarSync" TIMESTAMP(3),
ADD COLUMN     "msAccessToken" TEXT,
ADD COLUMN     "msRefreshToken" TEXT,
ADD COLUMN     "msTokenExpiry" TIMESTAMP(3);
