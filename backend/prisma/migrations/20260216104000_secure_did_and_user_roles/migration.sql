/*
  Warnings:

  - You are about to drop the column `privateKey` on the `DidDocument` table. All the data in the column will be lost.
  - You are about to drop the column `adminId` on the `Organization` table. All the data in the column will be lost.
  - Added the required column `encryptedPrivateKey` to the `DidDocument` table without a default value. This is not possible if the table is not empty.
  - Added the required column `encryptionIv` to the `DidDocument` table without a default value. This is not possible if the table is not empty.
  - Added the required column `encryptionSalt` to the `DidDocument` table without a default value. This is not possible if the table is not empty.
  - Added the required column `publicKey` to the `DidDocument` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `Organization` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'ADMIN';

-- AlterEnum
ALTER TYPE "VerifiableCredentialStatus" ADD VALUE 'DELETED';

-- DropForeignKey
ALTER TABLE "Organization" DROP CONSTRAINT "Organization_adminId_fkey";

-- AlterTable
ALTER TABLE "DidDocument" DROP COLUMN "privateKey",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "encryptedPrivateKey" TEXT NOT NULL,
ADD COLUMN     "encryptionIv" TEXT NOT NULL,
ADD COLUMN     "encryptionSalt" TEXT NOT NULL,
ADD COLUMN     "publicKey" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Organization" DROP COLUMN "adminId",
ADD COLUMN     "userId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "pin" TEXT,
ADD COLUMN     "pinAttempts" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "VerifiableCredential" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AddForeignKey
ALTER TABLE "Organization" ADD CONSTRAINT "Organization_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
