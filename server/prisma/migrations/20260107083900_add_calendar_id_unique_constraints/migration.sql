/*
  Warnings:

  - A unique constraint covering the columns `[googleEventId]` on the table `Event` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[outlookEventId]` on the table `Event` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Event_googleEventId_key" ON "Event"("googleEventId");

-- CreateIndex
CREATE UNIQUE INDEX "Event_outlookEventId_key" ON "Event"("outlookEventId");
