-- Add Postiz fields without dropping the previous PostProxy columns.
-- Existing rows can be re-bound to Postiz through the CRM connection flow.
ALTER TABLE "Client"
ADD COLUMN IF NOT EXISTS "postizGroupId" TEXT;

ALTER TABLE "SocialConnection"
ADD COLUMN IF NOT EXISTS "postizIntegrationId" TEXT,
ADD COLUMN IF NOT EXISTS "postizGroupId" TEXT;

-- Keep legacy values available for rollback, but stop requiring PostProxy IDs
-- when new Postiz-backed connection rows are inserted.
ALTER TABLE "SocialConnection"
ALTER COLUMN "postproxyProfileId" DROP NOT NULL,
ALTER COLUMN "profileGroupId" DROP NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "SocialConnection_postizIntegrationId_key"
ON "SocialConnection"("postizIntegrationId");
