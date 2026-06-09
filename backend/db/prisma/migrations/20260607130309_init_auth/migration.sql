-- CreateEnum
CREATE TYPE "AvailabilityStatus" AS ENUM ('AVAILABLE', 'ON_LEAVE', 'SICK_LEAVE', 'REMOTE', 'HALF_DAY', 'TRAINING');

-- AlterTable
ALTER TABLE "Asset" ADD COLUMN     "brandNotes" TEXT,
ADD COLUMN     "dosAndDonts" TEXT,
ADD COLUMN     "fonts" TEXT,
ADD COLUMN     "referenceLinks" TEXT;

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "approvalComment" TEXT,
ADD COLUMN     "approvalUpdatedAt" TIMESTAMP(3),
ADD COLUMN     "assignedToName" TEXT,
ADD COLUMN     "assignmentType" TEXT NOT NULL DEFAULT 'manual',
ADD COLUMN     "captionCopy" TEXT,
ADD COLUMN     "clientFeedback" TEXT,
ADD COLUMN     "clientName" TEXT,
ADD COLUMN     "day" TEXT,
ADD COLUMN     "managerNotes" TEXT,
ADD COLUMN     "maxRevisions" INTEGER NOT NULL DEFAULT 2,
ADD COLUMN     "planMonth" TEXT,
ADD COLUMN     "postingDate" TIMESTAMP(3),
ADD COLUMN     "revisionCount" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "EmployeeAvailability" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "status" "AvailabilityStatus" NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "reason" TEXT,
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployeeAvailability_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "EmployeeAvailability" ADD CONSTRAINT "EmployeeAvailability_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeAvailability" ADD CONSTRAINT "EmployeeAvailability_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeAvailability" ADD CONSTRAINT "EmployeeAvailability_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
