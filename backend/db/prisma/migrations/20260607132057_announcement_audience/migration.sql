-- AlterTable
ALTER TABLE "Announcement" ADD COLUMN     "audience" TEXT NOT NULL DEFAULT 'everyone',
ADD COLUMN     "specificClientId" TEXT,
ADD COLUMN     "specificEmployeeId" TEXT;
