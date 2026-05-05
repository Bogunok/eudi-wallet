-- DropForeignKey
ALTER TABLE "DidDocument" DROP CONSTRAINT "DidDocument_userId_fkey";

-- DropForeignKey
ALTER TABLE "Organization" DROP CONSTRAINT "Organization_userId_fkey";

-- DropForeignKey
ALTER TABLE "VerifiableCredential" DROP CONSTRAINT "VerifiableCredential_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "VerifiableCredential" DROP CONSTRAINT "VerifiableCredential_userId_fkey";

-- DropForeignKey
ALTER TABLE "VerifiableCredentialRequest" DROP CONSTRAINT "VerifiableCredentialRequest_holderId_fkey";

-- DropForeignKey
ALTER TABLE "VerifiableCredentialRequest" DROP CONSTRAINT "VerifiableCredentialRequest_issuerId_fkey";

-- DropForeignKey
ALTER TABLE "VerifiableCredentialSchema" DROP CONSTRAINT "VerifiableCredentialSchema_issuerId_fkey";

-- DropForeignKey
ALTER TABLE "VerificationSession" DROP CONSTRAINT "VerificationSession_verifierId_fkey";

-- AddForeignKey
ALTER TABLE "DidDocument" ADD CONSTRAINT "DidDocument_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerifiableCredential" ADD CONSTRAINT "VerifiableCredential_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerifiableCredential" ADD CONSTRAINT "VerifiableCredential_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerifiableCredentialRequest" ADD CONSTRAINT "VerifiableCredentialRequest_holderId_fkey" FOREIGN KEY ("holderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerifiableCredentialRequest" ADD CONSTRAINT "VerifiableCredentialRequest_issuerId_fkey" FOREIGN KEY ("issuerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Organization" ADD CONSTRAINT "Organization_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerifiableCredentialSchema" ADD CONSTRAINT "VerifiableCredentialSchema_issuerId_fkey" FOREIGN KEY ("issuerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerificationSession" ADD CONSTRAINT "VerificationSession_verifierId_fkey" FOREIGN KEY ("verifierId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
