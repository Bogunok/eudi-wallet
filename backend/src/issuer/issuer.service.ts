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
import { RequestStatus, VerifiableCredentialStatus } from '@prisma/client';
import { ApproveRequestDto } from './dto/approve-request.dto';
import { GleifMockService } from './gleif-mock.service';

@Injectable()
export class IssuerService {
  private ajv = new Ajv({ allErrors: true });
  constructor(
    private prisma: PrismaService,
    private didService: DidService,
    private readonly gleifMock: GleifMockService,
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

    //логіка для перевірки у внутрішньому mock реєстрі
    const claimData = request.claimData as any;

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
      const declaredLei = claimData.leiCode || claimData.lei || holderOrg.lei;
      const declaredName = claimData.companyName || claimData.name || holderOrg.name;

      try {
        const isDataValid = await this.gleifMock.verifyOrganization(declaredLei, declaredName);

        if (!isDataValid) {
          await this.prisma.verifiableCredentialRequest.update({
            where: { id: requestId },
            data: { status: RequestStatus.REJECTED },
          });
          throw new BadRequestException(
            'Verification failed: The declared data does not match the official external registry.',
          );
        }
      } catch (error) {
        if (error instanceof InternalServerErrorException) throw error;
        throw new InternalServerErrorException(
          'Verification process encountered an unexpected network error.',
        );
      }
    }

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

    const encodeBase64Url = (str: string | Buffer) => {
      return (typeof str === 'string' ? Buffer.from(str) : str)
        .toString('base64url')
        .replace(/=/g, '');
    };

    const disclosures: string[] = []; // розкриті дані у Base64Url
    const sdHashes: string[] = []; //  хеші, які покладемо в JWT

    // Проходимося по всіх даних, які ми хочемо зробити прихованими
    for (const [key, value] of Object.entries(request.claimData as any)) {
      const salt = crypto.randomBytes(16).toString('base64url').replace(/=/g, '');

      const disclosureArray = [salt, key, value];
      const disclosureString = JSON.stringify(disclosureArray);

      const disclosureB64url = encodeBase64Url(disclosureString);
      disclosures.push(disclosureB64url);

      const hash = crypto.createHash('sha256').update(disclosureB64url).digest();
      const hashB64url = encodeBase64Url(hash);
      sdHashes.push(hashB64url);
    }

    const jwtPayload = {
      iss: issuerDidDoc.did,
      sub: subjectDid,
      iat: Math.floor(Date.now() / 1000),
      vct: request.schema.name, // Тип документа
      _sd: sdHashes, // Масив хешів прихованих полів
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
    const signedJwt = `${unsignedToken}.${encodeBase64Url(signature)}`;

    // ФІНАЛЬНИЙ SD-JWT
    // Формат: <signed_jwt>~<disclosure_1>~<disclosure_2>~
    // (Остання тильда обов'язкова, вона показує, що поки немає прив'язки до ключа - Key Binding)
    const sdJwtToken = `${signedJwt}~${disclosures.join('~')}~`;

    const issuedCredential = await this.prisma.verifiableCredential.create({
      data: {
        type: ['VerifiableCredential', request.schema.name],
        issuerDid: issuerDidDoc.did,
        subjectDid: subjectDid,
        payload: jwtPayload,
        rawJwt: sdJwtToken,
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
      message: 'SD-JWT Credential issued successfully!',
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
