-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "assignedAM" TEXT,
ADD COLUMN     "assignedManager" TEXT,
ADD COLUMN     "brandColor" TEXT,
ADD COLUMN     "brandName" TEXT,
ADD COLUMN     "contactPerson" TEXT,
ADD COLUMN     "deliverableBreakdown" JSONB,
ADD COLUMN     "industry" TEXT,
ADD COLUMN     "monthlyDeliverables" INTEGER NOT NULL DEFAULT 30,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "platforms" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "renewalDate" TIMESTAMP(3),
ADD COLUMN     "startDate" TIMESTAMP(3),
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'active';
