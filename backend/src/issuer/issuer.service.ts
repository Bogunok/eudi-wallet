import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DidService } from '../did/did.service';
import * as crypto from 'crypto';
import { RequestStatus, VerifiableCredentialStatus } from '@prisma/client';
import { ApproveRequestDto } from './dto/approve-request.dto';

@Injectable()
export class IssuerService {
  constructor(
    private prisma: PrismaService,
    private didService: DidService,
  ) {}

  async getPendingRequests(issuerId: string) {
    return this.prisma.verifiableCredentialRequest.findMany({
      where: {
        issuerId: issuerId,
        status: RequestStatus.PENDING,
      },
      include: {
        schema: true,
        holder: {
          include: { organizations: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async approveRequestAndIssue(requestId: string, issuerId: string, dto: ApproveRequestDto) {
    // Знаходимо заявку
    const request = await this.prisma.verifiableCredentialRequest.findUnique({
      where: { id: requestId },
      include: { schema: true },
    });

    if (!request || request.issuerId !== issuerId) {
      throw new ForbiddenException('Request not found or you do not have access');
    }
    if (request.status !== RequestStatus.PENDING) {
      throw new BadRequestException('This request has been already processed');
    }

    // Дістаємо DID Гаманця (кому видаємо)
    const holderOrg = await this.prisma.organization.findFirst({
      where: { userId: request.holderId },
    });
    if (!holderOrg) throw new BadRequestException('Organization of the holder not found');

    // Дістаємо ключі Емітента і розшифровуємо їх PIN-кодом
    const issuerDidDoc = await this.prisma.didDocument.findFirst({
      where: { userId: issuerId },
    });
    if (!issuerDidDoc) throw new NotFoundException('DID of the issuer not found');

    const decryptedPrivateKeyBase64 = await this.didService.decryptWithPin(
      issuerDidDoc.encryptedPrivateKey,
      issuerDidDoc.encryptionSalt,
      issuerDidDoc.encryptionIv,
      dto.pin,
    );

    // Дістаємо DID Організації-отримувача з бази
    const holderDidDoc = await this.prisma.didDocument.findFirst({
      where: { userId: request.holderId },
    });

    if (!holderDidDoc) {
      throw new BadRequestException('Organization has not set the DID yet');
    }

    const subjectDid = holderDidDoc.did;

    const vcPayload = {
      '@context': ['https://www.w3.org/2018/credentials/v1'],
      type: ['VerifiableCredential', request.schema.name],
      credentialSchema: { id: request.schema.schemaId, type: 'JsonSchemaValidator2018' },
      credentialSubject: {
        id: subjectDid,
        ...(request.claimData as any),
      },
    };

    // Підписуємо JWT
    const jwtHeader = { alg: 'EdDSA', typ: 'JWT', kid: issuerDidDoc.keyId };
    const jwtPayload = {
      iss: issuerDidDoc.did,
      sub: subjectDid,
      iat: Math.floor(Date.now() / 1000),
      vc: vcPayload,
    };

    const encodeBase64Url = (obj: any) => Buffer.from(JSON.stringify(obj)).toString('base64url');
    const unsignedToken = `${encodeBase64Url(jwtHeader)}.${encodeBase64Url(jwtPayload)}`;

    const privateKeyObj = crypto.createPrivateKey({
      key: Buffer.from(decryptedPrivateKeyBase64, 'base64'),
      format: 'der',
      type: 'pkcs8',
    });
    const signature = crypto.sign(null, Buffer.from(unsignedToken), privateKeyObj);
    const rawJwt = `${unsignedToken}.${signature.toString('base64url')}`;

    //Зберігаємо виданий документ у БД
    const issuedCredential = await this.prisma.verifiableCredential.create({
      data: {
        type: ['VerifiableCredential', request.schema.name],
        issuerDid: issuerDidDoc.did,
        subjectDid: subjectDid,
        payload: vcPayload,
        rawJwt: rawJwt,
        issuedAt: new Date(),
        status: VerifiableCredentialStatus.ACTIVE,
        userId: request.holderId,
        organizationId: holderOrg.id,
      },
    });

    await this.prisma.verifiableCredentialRequest.update({
      where: { id: requestId },
      data: { status: RequestStatus.APPROVED },
    });

    return {
      message: 'Document issued successfully!',
      credentialId: issuedCredential.id,
    };
  }

  async revokeCredential(vcId: string, issuerId: string) {
    const vc = await this.prisma.verifiableCredential.findUnique({ where: { id: vcId } });
    if (!vc) throw new NotFoundException('Document not found');

    const issuerDidDoc = await this.prisma.didDocument.findUnique({ where: { did: vc.issuerDid } });
    if (!issuerDidDoc || issuerDidDoc.userId !== issuerId) {
      throw new ForbiddenException('Only the issuer can revoke this credential');
    }

    return this.prisma.verifiableCredential.update({
      where: { id: vcId },
      data: { status: VerifiableCredentialStatus.REVOKED },
    });
  }
}
