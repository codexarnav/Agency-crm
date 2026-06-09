-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "managerId" TEXT;

-- AlterTable
ALTER TABLE "Company" ADD COLUMN     "notificationPreferences" JSONB,
ADD COLUMN     "permissions" JSONB,
ADD COLUMN     "publishingConnections" JSONB;

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
