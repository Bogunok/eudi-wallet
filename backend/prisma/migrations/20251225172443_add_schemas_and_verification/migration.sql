/*
  Warnings:

  - The `status` column on the `VerifiableCredential` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Added the required column `updatedAt` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `rawJwt` to the `VerifiableCredential` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "Role" AS ENUM ('HOLDER', 'ISSUER', 'VERIFIER');

-- CreateEnum
CREATE TYPE "VerifiableCredentialStatus" AS ENUM ('ACTIVE', 'REVOKED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED');

-- AlterTable
ALTER TABLE "DidDocument" ADD COLUMN     "keyId" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "refreshToken" TEXT,
ADD COLUMN     "role" "Role" NOT NULL DEFAULT 'HOLDER',
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "VerifiableCredential" ADD COLUMN     "expiresAt" TIMESTAMP(3),
ADD COLUMN     "rawJwt" TEXT NOT NULL,
DROP COLUMN "status",
ADD COLUMN     "status" "VerifiableCredentialStatus" NOT NULL DEFAULT 'ACTIVE';

-- CreateTable
CREATE TABLE "VerifiableCredentialSchema" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "schemaId" TEXT NOT NULL,
    "structure" JSONB NOT NULL,
    "issuerId" TEXT NOT NULL,

    CONSTRAINT "VerifiableCredentialSchema_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationSession" (
    "id" TEXT NOT NULL,
    "nonce" TEXT NOT NULL,
    "status" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
    "requestedType" TEXT NOT NULL,
    "holderDid" TEXT,
    "presentedData" JSONB,
    "verifierId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VerificationSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VerificationSession_nonce_key" ON "VerificationSession"("nonce");

-- AddForeignKey
ALTER TABLE "VerifiableCredentialSchema" ADD CONSTRAINT "VerifiableCredentialSchema_issuerId_fkey" FOREIGN KEY ("issuerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerificationSession" ADD CONSTRAINT "VerificationSession_verifierId_fkey" FOREIGN KEY ("verifierId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
