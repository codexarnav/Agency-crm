-- AlterTable
ALTER TABLE "PublishingJob" ALTER COLUMN "platform" TYPE TEXT;

-- AlterTable
ALTER TABLE "Report" ALTER COLUMN "platform" TYPE TEXT;

-- AlterTable
ALTER TABLE "Task" ALTER COLUMN "platform" TYPE TEXT,
ALTER COLUMN "contentType" TYPE TEXT;
