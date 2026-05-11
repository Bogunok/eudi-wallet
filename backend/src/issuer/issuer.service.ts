import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DidService } from '../did/did.service';
import * as crypto from 'crypto';
import Ajv from 'ajv';
import { NotificationType, RequestStatus, VerifiableCredentialStatus } from '@prisma/client';
import { ApproveRequestDto } from './dto/approve-request.dto';
import { GleifMockService } from './gleif-mock.service';
import { NotificationService } from 'src/notification/notification.service';
import { Prisma, Role } from '@prisma/client';

const CREDENTIAL_VALIDITY_DAYS: Record<string, number> = {
  LEI: 365,
  LegalEntityIdentifier: 365,
  'Business License': 730,
};
const DEFAULT_VALIDITY_DAYS = 365;

@Injectable()
export class IssuerService {
  private ajv = new Ajv({ allErrors: true });
  constructor(
    private prisma: PrismaService,
    private didService: DidService,
    private readonly gleifMock: GleifMockService,
    private readonly notificationService: NotificationService,
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
          include: {
            organizations: true,
            didDocuments: {
              where: { deactivatedAt: { equals: null } },
              select: { did: true },
              take: 1,
            },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async getIssuedCredentials(issuerId: string) {
    const issuerDids = await this.prisma.didDocument.findMany({
      where: { userId: issuerId },
      select: { did: true },
    });

    if (issuerDids.length === 0) return [];

    const dids = issuerDids.map(d => d.did);

    return this.prisma.verifiableCredential.findMany({
      where: { issuerDid: { in: dids } },
      include: {
        organization: { select: { name: true, lei: true } },
        user: { select: { email: true } },
      },
      orderBy: { issuedAt: 'desc' },
    });
  }

  async getTrustedIssuers() {
    const issuers = await this.prisma.user.findMany({
      where: { role: Role.ISSUER },
      select: {
        id: true,
        email: true,
        organizations: { select: { name: true, lei: true } },
      },
    });

    return issuers.map(issuer => ({
      id: issuer.id,
      name: issuer.organizations[0]?.name || issuer.email,
      lei: issuer.organizations[0]?.lei || 'N/A',
    }));
  }

  private computeExpiresAt(schemaName: string): Date {
    const days = CREDENTIAL_VALIDITY_DAYS[schemaName] ?? DEFAULT_VALIDITY_DAYS;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + days);
    return expiresAt;
  }

  async approveRequestAndIssue(requestId: string, issuerId: string, dto: ApproveRequestDto) {
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

    const holderOrg = await this.prisma.organization.findFirst({
      where: { userId: request.holderId },
    });

    const claimData = request.claimData as Record<string, unknown>;
    const isLeiSchema = request.schema.name === 'LEI';

    if (!holderOrg && !isLeiSchema) {
      throw new BadRequestException('Organization of the holder not found');
    }

    const finalClaimData: Record<string, unknown> = { ...claimData };
    if (isLeiSchema && dto.assignedLei) {
      finalClaimData['lei'] = dto.assignedLei;
    }

    try {
      const validate = this.ajv.compile(request.schema.structure as object);
      const isValid = validate(claimData);
      if (!isValid) {
        const errorMessages = this.ajv.errorsText(validate.errors, { separator: ', ' });
        throw new BadRequestException(
          `Data does not match the schema format. Errors: ${errorMessages}`,
        );
      }
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new InternalServerErrorException('Failed to compile or validate JSON schema');
    }

    if (request.schema.name === 'LegalEntityIdentifier') {
      const data = claimData as {
        leiCode?: string;
        lei?: string;
        companyName?: string;
        name?: string;
      };
      const declaredLei = data.leiCode || data.lei || holderOrg?.lei || '';
      const declaredName = data.companyName || data.name || holderOrg?.name || '';

      try {
        const isDataValid = await this.gleifMock.verifyOrganization(declaredLei, declaredName);
        if (!isDataValid) {
          await this.prisma.verifiableCredentialRequest.update({
            where: { id: requestId },
            data: { status: RequestStatus.REJECTED },
          });
          await this.notificationService.create({
            userId: request.holderId,
            title: 'Request denied',
            message: `Data differs from the official registry ${request.schema.name}.`,
            type: NotificationType.WARNING,
          });
          throw new BadRequestException(
            'Verification failed: The declared data does not match the official external registry.',
          );
        }
      } catch (error) {
        if (error instanceof BadRequestException) throw error;
        throw new InternalServerErrorException(
          'Verification process encountered an unexpected network error.',
        );
      }
    }

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

    const holderDidDoc = await this.prisma.didDocument.findFirst({
      where: { userId: request.holderId },
    });

    if (!holderDidDoc && !isLeiSchema) {
      throw new BadRequestException('Organization has not set the DID yet');
    }

    let subjectDid: string;
    if (holderDidDoc) {
      subjectDid = holderDidDoc.did;
    } else {
      const holderUser = await this.prisma.user.findUnique({
        where: { id: request.holderId },
      });
      subjectDid = `mailto:${holderUser!.email}`;
    }

    const expiresAt = this.computeExpiresAt(request.schema.name);

    const encodeBase64Url = (str: string | Buffer) =>
      (typeof str === 'string' ? Buffer.from(str) : str).toString('base64url').replace(/=/g, '');

    const disclosures: string[] = [];
    const sdHashes: string[] = [];

    for (const [key, value] of Object.entries(finalClaimData)) {
      const salt = crypto.randomBytes(16).toString('base64url').replace(/=/g, '');
      const disclosureB64url = encodeBase64Url(JSON.stringify([salt, key, value]));
      disclosures.push(disclosureB64url);
      const hash = crypto.createHash('sha256').update(disclosureB64url).digest();
      sdHashes.push(encodeBase64Url(hash));
    }

    const jwtPayload = {
      iss: issuerDidDoc.did,
      sub: subjectDid,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(expiresAt.getTime() / 1000),
      vct: request.schema.name,
      _sd: sdHashes,
      _sd_alg: 'sha-256',
    };

    const jwtHeader = { alg: 'EdDSA', typ: 'vc+sd-jwt', kid: issuerDidDoc.keyId };

    const unsignedToken = `${encodeBase64Url(JSON.stringify(jwtHeader))}.${encodeBase64Url(JSON.stringify(jwtPayload))}`;

    const privateKeyObj = crypto.createPrivateKey({
      key: Buffer.from(decryptedPrivateKeyBase64, 'base64'),
      format: 'der',
      type: 'pkcs8',
    });

    const signature = crypto.sign(null, Buffer.from(unsignedToken), privateKeyObj);
    const sdJwtToken = `${unsignedToken}.${encodeBase64Url(signature)}~${disclosures.join('~')}~`;

    const issuedCredential = await this.prisma.verifiableCredential.create({
      data: {
        type: ['VerifiableCredential', request.schema.name],
        issuerDid: issuerDidDoc.did,
        subjectDid,
        payload: finalClaimData as Prisma.JsonObject,
        rawJwt: sdJwtToken,
        issuedAt: new Date(),
        expiresAt,
        status: VerifiableCredentialStatus.ACTIVE,
        userId: request.holderId,
        organizationId: holderOrg?.id ?? null,
      },
    });

    await this.prisma.verifiableCredentialRequest.update({
      where: { id: requestId },
      data: { status: RequestStatus.APPROVED },
    });

    await this.notificationService.create({
      userId: request.holderId,
      title: 'Document issued!',
      message: `Your document "${request.schema.name}" was successfully added to your wallet.`,
      type: NotificationType.ISSUANCE,
    });

    return {
      message: 'SD-JWT Credential issued successfully!',
      credentialId: issuedCredential.id,
    };
  }

  private async signAndSaveCredential(params: {
    issuerId: string;
    holderId: string;
    holderOrgId: string;
    schemaName: string;
    claimData: Record<string, unknown>;
    pin: string;
  }): Promise<string> {
    const { issuerId, holderId, holderOrgId, schemaName, claimData, pin } = params;

    const issuerDidDoc = await this.prisma.didDocument.findFirst({
      where: { userId: issuerId },
    });
    if (!issuerDidDoc) throw new NotFoundException('DID of the issuer not found');

    const decryptedPrivateKeyBase64 = await this.didService.decryptWithPin(
      issuerDidDoc.encryptedPrivateKey,
      issuerDidDoc.encryptionSalt,
      issuerDidDoc.encryptionIv,
      pin,
    );

    const holderDidDoc = await this.prisma.didDocument.findFirst({
      where: { userId: holderId },
    });
    if (!holderDidDoc) throw new BadRequestException('Organization has not set the DID yet');

    const subjectDid = holderDidDoc.did;
    const expiresAt = this.computeExpiresAt(schemaName);

    const encodeBase64Url = (str: string | Buffer) =>
      (typeof str === 'string' ? Buffer.from(str) : str).toString('base64url').replace(/=/g, '');

    const disclosures: string[] = [];
    const sdHashes: string[] = [];

    for (const [key, value] of Object.entries(claimData)) {
      const salt = crypto.randomBytes(16).toString('base64url').replace(/=/g, '');
      const disclosureB64url = encodeBase64Url(JSON.stringify([salt, key, value]));
      disclosures.push(disclosureB64url);
      const hash = crypto.createHash('sha256').update(disclosureB64url).digest();
      sdHashes.push(encodeBase64Url(hash));
    }

    const jwtPayload = {
      iss: issuerDidDoc.did,
      sub: subjectDid,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(expiresAt.getTime() / 1000),
      vct: schemaName,
      _sd: sdHashes,
      _sd_alg: 'sha-256',
    };

    const jwtHeader = { alg: 'EdDSA', typ: 'vc+sd-jwt', kid: issuerDidDoc.keyId };

    const unsignedToken = `${encodeBase64Url(JSON.stringify(jwtHeader))}.${encodeBase64Url(JSON.stringify(jwtPayload))}`;

    const privateKeyObj = crypto.createPrivateKey({
      key: Buffer.from(decryptedPrivateKeyBase64, 'base64'),
      format: 'der',
      type: 'pkcs8',
    });

    const signature = crypto.sign(null, Buffer.from(unsignedToken), privateKeyObj);
    const sdJwtToken = `${unsignedToken}.${encodeBase64Url(signature)}~${disclosures.join('~')}~`;

    const issued = await this.prisma.verifiableCredential.create({
      data: {
        type: ['VerifiableCredential', schemaName],
        issuerDid: issuerDidDoc.did,
        subjectDid,
        payload: claimData as Prisma.JsonObject,
        rawJwt: sdJwtToken,
        issuedAt: new Date(),
        expiresAt,
        status: VerifiableCredentialStatus.ACTIVE,
        userId: holderId,
        organizationId: holderOrgId,
      },
    });

    return issued.id;
  }

  async revokeCredential(vcId: string, issuerId: string) {
    const vc = await this.prisma.verifiableCredential.findUnique({ where: { id: vcId } });
    if (!vc) throw new NotFoundException('Document not found');

    const issuerDidDoc = await this.prisma.didDocument.findUnique({ where: { did: vc.issuerDid } });
    if (!issuerDidDoc || issuerDidDoc.userId !== issuerId) {
      throw new ForbiddenException('Only the issuer can revoke this credential');
    }

    const revokedVc = await this.prisma.verifiableCredential.update({
      where: { id: vcId },
      data: { status: VerifiableCredentialStatus.REVOKED },
    });

    const documentName = vc.type && vc.type.length > 1 ? vc.type[1] : 'Document';

    await this.notificationService.create({
      userId: vc.userId,
      title: 'Document revoked!',
      message: `Issuer revoked your document "${documentName}". It is not valid anymore and you can't use it in any way`,
      type: NotificationType.WARNING,
    });

    return revokedVc;
  }

  async getRevocationRequests(issuerId: string) {
    return this.prisma.revocationRequest.findMany({
      where: { issuerId, status: 'PENDING' },
      include: {
        vc: { select: { type: true, payload: true, issuerDid: true, rawJwt: true } },
        holder: {
          include: { organizations: { select: { name: true, lei: true } } },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async approveRevocationRequest(requestId: string, issuerId: string, pin?: string) {
    const request = await this.prisma.revocationRequest.findUnique({
      where: { id: requestId },
      include: {
        vc: { include: { organization: true } },
      },
    });
    if (!request) throw new NotFoundException('Request not found');
    if (request.issuerId !== issuerId) throw new ForbiddenException('Not your request');

    await this.revokeCredential(request.vcId, issuerId);

    if (request.type === 'UPDATE' && request.newClaimData && pin) {
      const vcTypeName = request.vc.type?.[1];
      const schema = await this.prisma.verifiableCredentialSchema.findFirst({
        where: {
          issuerId,
          ...(vcTypeName ? { name: vcTypeName } : {}),
        },
      });
      if (!schema) throw new NotFoundException('Schema not found for this credential type');

      const holderOrg = await this.prisma.organization.findFirst({
        where: { userId: request.holderId },
      });
      if (!holderOrg) throw new BadRequestException('Holder organization not found');

      let finalClaimData = request.newClaimData as Record<string, unknown>;

      if (schema.name === 'LEI') {
        const oldPayload = request.vc.payload as Record<string, unknown>;
        finalClaimData = {
          lei: oldPayload['lei'],
          ...finalClaimData,
        };
      }

      await this.signAndSaveCredential({
        issuerId,
        holderId: request.holderId,
        holderOrgId: holderOrg.id,
        schemaName: schema.name,
        claimData: finalClaimData,
        pin,
      });
    }

    await this.prisma.revocationRequest.update({
      where: { id: requestId },
      data: { status: 'APPROVED' },
    });

    const docName = request.vc.type?.[1] ?? 'Document';
    await this.notificationService.create({
      userId: request.holderId,
      title: request.type === 'UPDATE' ? 'Document update approved' : 'Revocation approved',
      message:
        request.type === 'UPDATE'
          ? `Your "${docName}" has been revoked and a new version has been issued to your wallet.`
          : `Your "${docName}" has been successfully revoked as requested.`,
      type: request.type === 'UPDATE' ? NotificationType.ISSUANCE : NotificationType.SYSTEM,
    });

    return { message: 'Request approved' };
  }

  async rejectRevocationRequest(requestId: string, issuerId: string) {
    const request = await this.prisma.revocationRequest.findUnique({
      where: { id: requestId },
    });
    if (!request) throw new NotFoundException('Request not found');
    if (request.issuerId !== issuerId) throw new ForbiddenException('Not your request');

    await this.prisma.revocationRequest.update({
      where: { id: requestId },
      data: { status: 'REJECTED' },
    });

    await this.notificationService.create({
      userId: request.holderId,
      title: request.type === 'UPDATE' ? 'Document update rejected' : 'Revocation rejected',
      message: `Your ${request.type.toLowerCase()} request was rejected by the issuer.`,
      type: NotificationType.WARNING,
    });

    return { message: 'Request rejected' };
  }
}
