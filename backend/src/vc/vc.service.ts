import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';
import { CreateVerifiableCredentialDto } from './dto/create-credential.dto';
import { v4 as uuidv4 } from 'uuid';
import { VerifiableCredentialStatus } from '@prisma/client';
import * as crypto from 'crypto';
import { DidService } from '../did/did.service';

@Injectable()
export class VcService {
  constructor(
    private prisma: PrismaService,
    private authService: AuthService,
    private didService: DidService,
  ) {}

  async issueAndSaveCredential(dto: CreateVerifiableCredentialDto, userId: string) {
    const organization = await this.prisma.organization.findFirst({
      where: { id: dto.organizationId, userId: userId },
    });
    if (!organization) throw new ForbiddenException('Access denied');

    const schema = await this.prisma.verifiableCredentialSchema.findUnique({
      where: { id: dto.schemaId },
    });

    if (!schema || schema.issuerId !== userId) {
      throw new NotFoundException('Credential Schema not found or access denied');
    }

    // Отримуємо DID документ емітента
    const issuerDidDoc = await this.prisma.didDocument.findFirst({
      where: { userId: userId },
    });
    if (!issuerDidDoc) throw new NotFoundException('DID document not found');

    // Розшифровуємо приватний ключ
    const decryptedPrivateKeyBase64 = await this.didService.decryptWithPin(
      issuerDidDoc.encryptedPrivateKey,
      issuerDidDoc.encryptionSalt,
      issuerDidDoc.encryptionIv,
      dto.pin,
    );

    const vcPayload = {
      '@context': ['https://www.w3.org/2018/credentials/v1'],
      type: ['VerifiableCredential', schema.name],

      // посилання на публічну схему
      credentialSchema: {
        id: schema.schemaId, // посилання на EBSI/IPFS
        type: 'JsonSchemaValidator2018',
      },

      credentialSubject: {
        id: dto.subjectDid,
        ...dto.credentialData,
      },
    };

    const jwtHeader = { alg: 'EdDSA', typ: 'JWT', kid: issuerDidDoc.keyId };
    const jwtPayload = {
      iss: issuerDidDoc.did,
      sub: dto.subjectDid,
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

    // Збереження універсального документа в БД
    return this.prisma.verifiableCredential.create({
      data: {
        type: ['VerifiableCredential', schema.name],
        issuerDid: issuerDidDoc.did,
        subjectDid: dto.subjectDid,
        payload: vcPayload,
        rawJwt: rawJwt,
        issuedAt: new Date(),
        status: VerifiableCredentialStatus.ACTIVE,
        userId: userId,
        organizationId: dto.organizationId,
      },
    });
  }

  //Отримати список усіх активних документів для екрана гаманця
  async findAllCredentials(organizationId: string, userId: string) {
    // Перевірка прав доступу перед поверненням списку
    const org = await this.prisma.organization.findFirst({
      where: { id: organizationId, userId },
    });
    if (!org) throw new ForbiddenException('Access denied');

    return this.prisma.verifiableCredential.findMany({
      where: {
        organizationId,
        status: VerifiableCredentialStatus.ACTIVE,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  //Детальний перегляд конкретного документа
  async findCredentialById(id: string, userId: string) {
    const credential = await this.prisma.verifiableCredential.findUnique({
      where: {
        id: id,
        userId: userId,
      },
    });

    if (!credential) {
      throw new NotFoundException('Document not found in wallet');
    }

    return credential;
  }

  //Локальне видалення документа
  async deleteCredentialLocally(id: string, userId: string) {
    const credential = await this.findCredentialById(id, userId);

    return this.prisma.verifiableCredential.update({
      where: { id: credential.id },
      data: { status: VerifiableCredentialStatus.DELETED },
    });
  }

  async revokeCredential(vcId: string, issuerUserId: string) {
    const vc = await this.prisma.verifiableCredential.findUnique({
      where: { id: vcId },
    });

    if (!vc) {
      throw new NotFoundException('Verifiable Credential not found');
    }

    if (vc.status === VerifiableCredentialStatus.REVOKED) {
      throw new BadRequestException('This credential is already revoked');
    }

    // чи дійсно цей користувач є Емітентом
    const issuerDidDoc = await this.prisma.didDocument.findUnique({
      where: { did: vc.issuerDid },
    });

    if (!issuerDidDoc || issuerDidDoc.userId !== issuerUserId) {
      throw new ForbiddenException(
        'Only the issuer (organization that issued the document) can revoke it',
      );
    }

    const updatedVc = await this.prisma.verifiableCredential.update({
      where: { id: vcId },
      data: {
        status: VerifiableCredentialStatus.REVOKED,
      },
    });

    return {
      message: 'Document successfully revoked',
      vcId: updatedVc.id,
      status: updatedVc.status,
    };
  }
}
