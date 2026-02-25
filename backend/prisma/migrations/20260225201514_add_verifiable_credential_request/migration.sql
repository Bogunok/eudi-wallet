-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "VerifiableCredentialRequest" (
    "id" TEXT NOT NULL,
    "holderId" TEXT NOT NULL,
    "issuerId" TEXT NOT NULL,
    "schemaId" TEXT NOT NULL,
    "claimData" JSONB NOT NULL,
    "status" "RequestStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VerifiableCredentialRequest_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "VerifiableCredentialRequest" ADD CONSTRAINT "VerifiableCredentialRequest_holderId_fkey" FOREIGN KEY ("holderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerifiableCredentialRequest" ADD CONSTRAINT "VerifiableCredentialRequest_issuerId_fkey" FOREIGN KEY ("issuerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerifiableCredentialRequest" ADD CONSTRAINT "VerifiableCredentialRequest_schemaId_fkey" FOREIGN KEY ("schemaId") REFERENCES "VerifiableCredentialSchema"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
