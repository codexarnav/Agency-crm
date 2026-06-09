-- AlterTable
ALTER TABLE "User" ADD COLUMN     "availability" TEXT DEFAULT 'available',
ADD COLUMN     "department" TEXT,
ADD COLUMN     "designation" TEXT,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "skills" TEXT[] DEFAULT ARRAY[]::TEXT[];
