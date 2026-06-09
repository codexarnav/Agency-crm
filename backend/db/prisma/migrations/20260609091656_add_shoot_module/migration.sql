-- CreateEnum
CREATE TYPE "ShootStatus" AS ENUM ('BRIEF_CREATED', 'SCRIPT_PENDING', 'SCRIPT_SUBMITTED', 'SCRIPT_APPROVED', 'SCRIPT_CHANGES_REQUESTED', 'CREW_ASSIGNED', 'SCHEDULED', 'IN_PROGRESS', 'RAW_UPLOADED', 'EDITING', 'READY_FOR_REVIEW', 'CLIENT_APPROVAL', 'PUBLISHED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ShootPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "ShootScriptStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'CHANGES_REQUESTED');

-- CreateEnum
CREATE TYPE "ShootCrewRole" AS ENUM ('VIDEOGRAPHER', 'PHOTOGRAPHER', 'EDITOR', 'ASSISTANT');

-- CreateEnum
CREATE TYPE "ShootAssetType" AS ENUM ('RAW', 'EDITED', 'FINAL', 'BTS');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'SHOOT_BRIEF_ASSIGNED';
ALTER TYPE "NotificationType" ADD VALUE 'SHOOT_SCRIPT_SUBMITTED';
ALTER TYPE "NotificationType" ADD VALUE 'SHOOT_SCRIPT_APPROVED';
ALTER TYPE "NotificationType" ADD VALUE 'SHOOT_SCRIPT_CHANGES_REQUESTED';
ALTER TYPE "NotificationType" ADD VALUE 'SHOOT_CREW_ASSIGNED';
ALTER TYPE "NotificationType" ADD VALUE 'SHOOT_SCHEDULED';
ALTER TYPE "NotificationType" ADD VALUE 'SHOOT_STARTED';
ALTER TYPE "NotificationType" ADD VALUE 'SHOOT_RAW_UPLOADED';
ALTER TYPE "NotificationType" ADD VALUE 'SHOOT_EDITING_TASKS_GENERATED';

-- CreateTable
CREATE TABLE "Shoot" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "managerId" TEXT NOT NULL,
    "creativeLeadId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "objective" TEXT,
    "deliverables" TEXT,
    "targetAudience" TEXT,
    "priority" "ShootPriority" NOT NULL,
    "status" "ShootStatus" NOT NULL,
    "expectedDeadline" TIMESTAMP(3),
    "shootDate" TIMESTAMP(3),
    "shootTime" TEXT,
    "location" TEXT,
    "clientContact" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Shoot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShootScript" (
    "id" TEXT NOT NULL,
    "shootId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "hook" TEXT,
    "script" TEXT,
    "voiceover" TEXT,
    "cta" TEXT,
    "references" TEXT,
    "status" "ShootScriptStatus" NOT NULL,
    "managerFeedback" TEXT,
    "submittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShootScript_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShootCrew" (
    "id" TEXT NOT NULL,
    "shootId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "role" "ShootCrewRole" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShootCrew_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShootAsset" (
    "id" TEXT NOT NULL,
    "shootId" TEXT NOT NULL,
    "assetUrl" TEXT NOT NULL,
    "assetType" "ShootAssetType" NOT NULL,
    "uploadedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShootAsset_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Shoot" ADD CONSTRAINT "Shoot_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shoot" ADD CONSTRAINT "Shoot_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shoot" ADD CONSTRAINT "Shoot_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shoot" ADD CONSTRAINT "Shoot_creativeLeadId_fkey" FOREIGN KEY ("creativeLeadId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShootScript" ADD CONSTRAINT "ShootScript_shootId_fkey" FOREIGN KEY ("shootId") REFERENCES "Shoot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShootScript" ADD CONSTRAINT "ShootScript_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShootCrew" ADD CONSTRAINT "ShootCrew_shootId_fkey" FOREIGN KEY ("shootId") REFERENCES "Shoot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShootCrew" ADD CONSTRAINT "ShootCrew_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShootAsset" ADD CONSTRAINT "ShootAsset_shootId_fkey" FOREIGN KEY ("shootId") REFERENCES "Shoot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShootAsset" ADD CONSTRAINT "ShootAsset_uploadedBy_fkey" FOREIGN KEY ("uploadedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
