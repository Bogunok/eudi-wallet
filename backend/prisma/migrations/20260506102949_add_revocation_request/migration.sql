-- CreateEnum
CREATE TYPE "RevocationRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "RevocationRequestType" AS ENUM ('REVOCATION', 'UPDATE');

-- CreateTable
CREATE TABLE "RevocationRequest" (
    "id" TEXT NOT NULL,
    "type" "RevocationRequestType" NOT NULL DEFAULT 'REVOCATION',
    "status" "RevocationRequestStatus" NOT NULL DEFAULT 'PENDING',
    "vcId" TEXT NOT NULL,
    "holderId" TEXT NOT NULL,
    "issuerId" TEXT NOT NULL,
    "newClaimData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RevocationRequest_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "RevocationRequest" ADD CONSTRAINT "RevocationRequest_vcId_fkey" FOREIGN KEY ("vcId") REFERENCES "VerifiableCredential"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RevocationRequest" ADD CONSTRAINT "RevocationRequest_holderId_fkey" FOREIGN KEY ("holderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RevocationRequest" ADD CONSTRAINT "RevocationRequest_issuerId_fkey" FOREIGN KEY ("issuerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
