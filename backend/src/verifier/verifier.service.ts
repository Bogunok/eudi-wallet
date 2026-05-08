import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import * as crypto from 'crypto';
import { VerificationStatus } from '@prisma/client';
import { WalletPresentationResponseDto } from './dto/wallet-presentation-response.dto';
import { Role } from '@prisma/client';

@Injectable()
export class VerifierService {
  constructor(private readonly prisma: PrismaService) {}

  async createVerificationRequest(
    verifierId: string,
    requestedType: string,
    requestedFields: string[],
    purpose?: string,
  ) {
    const nonce = crypto.randomBytes(32).toString('hex');

    const session = await this.prisma.verificationSession.create({
      data: {
        nonce,
        requestedType,
        requestedFields,
        purpose: purpose ?? null,
        verifierId,
        status: VerificationStatus.PENDING,
        walletRequestUrl: '', // заповнимо після отримання id
      },
    });

    const fieldConstraints = [
      {
        path: ['$.vct'],
        filter: { type: 'string', pattern: requestedType },
      },
      ...requestedFields.map(field => ({
        path: [`$.${field}`],
        intent_to_retain: false,
      })),
    ];

    const presentationDefinition = {
      id: `pd_${session.id}`,
      input_descriptors: [
        {
          id: `${requestedType.toLowerCase()}_descriptor`,
          name: `Request for ${requestedType}`,
          purpose: purpose ?? `Verification of ${requestedType}`,
          format: { 'vc+sd-jwt': {} },
          constraints: {
            limit_disclosure: 'required',
            fields: fieldConstraints,
          },
        },
      ],
    };

    const clientId = 'VerifierWebApp';
    const apiBase = process.env.API_URL ?? 'http://localhost:3000';
    const responseUri = `${apiBase}/api/verifier/response/${session.id}`;

    const walletRequestUrl =
      `openid4vp://?` +
      `client_id=${encodeURIComponent(clientId)}` +
      `&response_type=vp_token` +
      `&nonce=${nonce}` +
      `&presentation_definition=${encodeURIComponent(JSON.stringify(presentationDefinition))}` +
      `&response_uri=${encodeURIComponent(responseUri)}`;

    // Зберігаємо URL в БД — щоб верифікатор міг повторно скопіювати його зі сторінки сесії
    await this.prisma.verificationSession.update({
      where: { id: session.id },
      data: { walletRequestUrl },
    });

    return {
      sessionId: session.id,
      nonce,
      walletRequestUrl,
      presentationDefinition,
    };
  }

  async getSessionPublic(sessionId: string) {
    const session = await this.prisma.verificationSession.findUnique({
      where: { id: sessionId },
      include: {
        verifier: {
          select: {
            email: true,
            organizations: { select: { name: true, lei: true } },
          },
        },
      },
    });

    if (!session) throw new NotFoundException('Verification session not found');

    if (session.status !== VerificationStatus.PENDING) {
      throw new BadRequestException('This verification session is no longer active');
    }

    return {
      sessionId: session.id,
      requestedType: session.requestedType,
      requestedFields: session.requestedFields,
      purpose: session.purpose,
      verifier: {
        name: session.verifier.organizations[0]?.name ?? session.verifier.email,
        lei: session.verifier.organizations[0]?.lei ?? null,
      },
      createdAt: session.createdAt,
    };
  }

  async getSessionById(sessionId: string, verifierId: string) {
    const session = await this.prisma.verificationSession.findFirst({
      where: { id: sessionId, verifierId },
    });

    if (!session) throw new NotFoundException('Verification session not found');

    return session;
  }

  async getSessionsByVerifierId(verifierId: string) {
    return this.prisma.verificationSession.findMany({
      where: { verifierId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getTrustedVerifiers() {
    const verifiers = await this.prisma.user.findMany({
      where: { role: Role.VERIFIER },
      select: {
        id: true,
        email: true,
        organizations: { select: { name: true, lei: true } },
      },
    });

    return verifiers.map(verifier => ({
      id: verifier.id,
      name: verifier.organizations[0]?.name ?? verifier.email,
      lei: verifier.organizations[0]?.lei ?? 'N/A',
    }));
  }

  async verifyWalletResponse(sessionId: string, dto: WalletPresentationResponseDto) {
    const session = await this.prisma.verificationSession.findUnique({
      where: { id: sessionId },
    });

    if (!session || session.status !== VerificationStatus.PENDING) {
      throw new BadRequestException('Session not found or already processed');
    }

    try {
      const verifiedData = await this.verifySdJwt(dto.vp_token);

      if (verifiedData.vct !== session.requestedType) {
        throw new BadRequestException(
          `Expected credential type ${session.requestedType}, but received ${verifiedData.vct}`,
        );
      }

      const missingFields = session.requestedFields.filter(
        field => !(field in verifiedData.disclosedData),
      );
      if (missingFields.length > 0) {
        throw new BadRequestException(
          `Missing required fields in presentation: ${missingFields.join(', ')}`,
        );
      }

      await this.prisma.verificationSession.update({
        where: { id: sessionId },
        data: {
          status: VerificationStatus.VERIFIED,
          presentedData: verifiedData.disclosedData,
          holderDid: verifiedData.subjectDid,
        },
      });

      return {
        success: true,
        message: 'SD-JWT signature is valid. Selective disclosures verified successfully.',
      };
    } catch (error) {
      await this.prisma.verificationSession.update({
        where: { id: sessionId },
        data: { status: VerificationStatus.REJECTED },
      });
      throw error;
    }
  }

  private async verifySdJwt(sdJwtToken: string) {
    const parts = sdJwtToken.split('~');
    const jwtPart = parts[0];
    const disclosures = parts.slice(1).filter(part => part.length > 0);
    const verifiedPayload = await this.verifyIssuerSignature(jwtPart);
    const sdHashesInPayload: string[] = verifiedPayload._sd || [];
    const disclosedData: Record<string, any> = {};

    for (const disclosureB64url of disclosures) {
      const hash = crypto.createHash('sha256').update(disclosureB64url, 'ascii').digest();
      const hashB64url = hash.toString('base64url').replace(/=/g, '');

      if (!sdHashesInPayload.includes(hashB64url)) {
        throw new BadRequestException(
          'Cryptographic mismatch: Disclosure hash not found in the signed SD-JWT payload',
        );
      }

      const disclosureString = Buffer.from(disclosureB64url, 'base64url').toString('utf-8');
      let salt, key, value;
      try {
        [salt, key, value] = JSON.parse(disclosureString);
      } catch {
        throw new BadRequestException('Invalid disclosure format');
      }

      disclosedData[key] = value;
    }

    return {
      issuerDid: verifiedPayload.iss,
      subjectDid: verifiedPayload.sub,
      vct: verifiedPayload.vct,
      disclosedData,
    };
  }

  private async verifyIssuerSignature(rawJwt: string): Promise<any> {
    const parts = rawJwt.split('.');
    if (parts.length !== 3) throw new BadRequestException('Invalid JWT format');

    const [headerB64, payloadB64, signatureB64] = parts;
    const unsignedToken = `${headerB64}.${payloadB64}`;
    const signature = Buffer.from(signatureB64, 'base64url');

    const payloadStr = Buffer.from(payloadB64, 'base64url').toString('utf-8');
    const payload = JSON.parse(payloadStr);

    const issuerDidDoc = await this.prisma.didDocument.findFirst({
      where: { did: payload.iss },
    });

    if (!issuerDidDoc) {
      throw new NotFoundException(`DID Document for issuer ${payload.iss} not found`);
    }

    let publicKeyObj: crypto.KeyObject;
    try {
      publicKeyObj = crypto.createPublicKey({
        key: issuerDidDoc.publicKey as any,
        format: 'jwk',
      });
    } catch {
      throw new BadRequestException('Failed to parse Issuer public key from DID Document.');
    }

    const isValid = crypto.verify(null, Buffer.from(unsignedToken), publicKeyObj, signature);

    if (!isValid) {
      throw new BadRequestException(
        'Cryptographic signature verification failed: fake or corrupted document',
      );
    }

    return payload;
  }
}
