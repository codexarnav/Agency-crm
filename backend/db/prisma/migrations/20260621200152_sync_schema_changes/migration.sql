-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'POST_PUBLISHED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'POST_PUBLISH_FAILED';

-- AlterEnum
ALTER TYPE "PublishingStatus" ADD VALUE IF NOT EXISTS 'PUBLISHING';
ALTER TYPE "PublishingStatus" ADD VALUE IF NOT EXISTS 'PUBLISHED';

-- AlterTable (Client)
ALTER TABLE "Client" 
ADD COLUMN IF NOT EXISTS "mustChangePassword" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS "postproxyGroupId" TEXT;

-- AlterTable (PublishingJob)
ALTER TABLE "PublishingJob" 
ADD COLUMN IF NOT EXISTS "attempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "lastError" TEXT,
ADD COLUMN IF NOT EXISTS "platforms" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN IF NOT EXISTS "processedAt" TIMESTAMP(3);

-- AlterTable (Task)
ALTER TABLE "Task" 
ADD COLUMN IF NOT EXISTS "metaPostIds" JSONB,
ADD COLUMN IF NOT EXISTS "postLink" TEXT,
ADD COLUMN IF NOT EXISTS "publishError" TEXT,
ADD COLUMN IF NOT EXISTS "publishedAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "publishingAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "selectedPlatforms" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateTable
CREATE TABLE IF NOT EXISTS "MetaConnection" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "facebookPageId" TEXT NOT NULL,
    "facebookPageName" TEXT NOT NULL,
    "facebookPageAccessToken" TEXT NOT NULL,
    "instagramBusinessId" TEXT NOT NULL,
    "instagramUsername" TEXT,
    "connectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MetaConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "SocialConnection" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "postproxyProfileId" TEXT NOT NULL,
    "profileName" TEXT,
    "profileGroupId" TEXT NOT NULL,
    "connectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SocialConnection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "MetaConnection_clientId_key" ON "MetaConnection"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "SocialConnection_clientId_platform_key" ON "SocialConnection"("clientId", "platform");

-- AddForeignKey (MetaConnection)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'MetaConnection_clientId_fkey' AND table_name = 'MetaConnection'
    ) THEN
        ALTER TABLE "MetaConnection" ADD CONSTRAINT "MetaConnection_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey (SocialConnection)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'SocialConnection_clientId_fkey' AND table_name = 'SocialConnection'
    ) THEN
        ALTER TABLE "SocialConnection" ADD CONSTRAINT "SocialConnection_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
