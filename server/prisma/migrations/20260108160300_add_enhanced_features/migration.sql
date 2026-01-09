-- CreateEnum
CREATE TYPE "ActionType" AS ENUM ('ACTION', 'DECISION', 'INSIGHT');

-- CreateEnum
CREATE TYPE "RiskLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "ReportPeriod" AS ENUM ('QUARTERLY', 'YEARLY');

-- AlterTable
ALTER TABLE "Action" ADD COLUMN     "isBlocker" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "riskLevel" "RiskLevel",
ADD COLUMN     "type" "ActionType" NOT NULL DEFAULT 'ACTION';

-- CreateTable
CREATE TABLE "MeetingTemplate" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" "EventCategory" NOT NULL,
    "agenda" JSONB NOT NULL,
    "checkpoints" TEXT[],
    "defaultDuration" INTEGER NOT NULL DEFAULT 60,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MeetingTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeeklyReport" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "weekStart" TIMESTAMP(3) NOT NULL,
    "weekEnd" TIMESTAMP(3) NOT NULL,
    "actionsCompleted" INTEGER NOT NULL DEFAULT 0,
    "actionsCreated" INTEGER NOT NULL DEFAULT 0,
    "meetingHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "focusHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "decisionsCount" INTEGER NOT NULL DEFAULT 0,
    "breakdownByArea" JSONB,
    "breakdownByTeam" JSONB,
    "summary" TEXT,
    "highlights" TEXT[],
    "challenges" TEXT[],
    "recommendations" TEXT[],
    "topAccomplishments" JSONB,
    "decisionsLogged" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WeeklyReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamMetricsSnapshot" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "openActions" INTEGER NOT NULL DEFAULT 0,
    "completedThisWeek" INTEGER NOT NULL DEFAULT 0,
    "overdueActions" INTEGER NOT NULL DEFAULT 0,
    "blockerCount" INTEGER NOT NULL DEFAULT 0,
    "avgCompletionDays" DOUBLE PRECISION,
    "avgMood" DOUBLE PRECISION,
    "oneOnOnesConducted" INTEGER NOT NULL DEFAULT 0,
    "teamMeetingsHeld" INTEGER NOT NULL DEFAULT 0,
    "velocityScore" DOUBLE PRECISION,
    "healthScore" DOUBLE PRECISION,
    "engagementScore" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeamMetricsSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeReport" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "reportType" "ReportPeriod" NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "actionsCompleted" INTEGER NOT NULL DEFAULT 0,
    "oneOnOnesCount" INTEGER NOT NULL DEFAULT 0,
    "avgMood" DOUBLE PRECISION,
    "competencyChanges" JSONB,
    "skillsGained" TEXT[],
    "feedbackSummary" TEXT,
    "strengths" TEXT[],
    "growthAreas" TEXT[],
    "narrative" TEXT,
    "recommendations" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmployeeReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MeetingTemplate_userId_idx" ON "MeetingTemplate"("userId");

-- CreateIndex
CREATE INDEX "WeeklyReport_userId_idx" ON "WeeklyReport"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "WeeklyReport_userId_weekStart_key" ON "WeeklyReport"("userId", "weekStart");

-- CreateIndex
CREATE INDEX "TeamMetricsSnapshot_teamId_idx" ON "TeamMetricsSnapshot"("teamId");

-- CreateIndex
CREATE INDEX "TeamMetricsSnapshot_date_idx" ON "TeamMetricsSnapshot"("date");

-- CreateIndex
CREATE INDEX "EmployeeReport_employeeId_idx" ON "EmployeeReport"("employeeId");

-- AddForeignKey
ALTER TABLE "MeetingTemplate" ADD CONSTRAINT "MeetingTemplate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeeklyReport" ADD CONSTRAINT "WeeklyReport_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamMetricsSnapshot" ADD CONSTRAINT "TeamMetricsSnapshot_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeReport" ADD CONSTRAINT "EmployeeReport_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
