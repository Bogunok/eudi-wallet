-- AlterTable
ALTER TABLE "VerificationSession" ADD COLUMN     "purpose" TEXT,
ADD COLUMN     "requestedFields" TEXT[];
