-- AlterTable
ALTER TABLE "Action" ADD COLUMN     "parentId" TEXT;

-- CreateTable
CREATE TABLE "DevelopmentPlan" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "goals" JSONB NOT NULL,
    "summary" TEXT,
    "focusAreas" TEXT[],
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DevelopmentPlan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DevelopmentPlan_employeeId_idx" ON "DevelopmentPlan"("employeeId");

-- CreateIndex
CREATE INDEX "Action_parentId_idx" ON "Action"("parentId");

-- AddForeignKey
ALTER TABLE "Action" ADD CONSTRAINT "Action_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Action"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DevelopmentPlan" ADD CONSTRAINT "DevelopmentPlan_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
