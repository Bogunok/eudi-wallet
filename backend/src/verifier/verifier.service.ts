import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import * as crypto from 'crypto';
import { VerificationStatus } from '@prisma/client';
import { WalletPresentationResponseDto } from './dto/wallet-presentation-response.dto';

@Injectable()
export class VerifierService {
  constructor(private readonly prisma: PrismaService) {}

  async createVerificationRequest(verifierId: string, requestedType: string) {
    // Generate a secure random nonce
    const nonce = crypto.randomBytes(32).toString('hex');

    const session = await this.prisma.verificationSession.create({
      data: {
        nonce,
        requestedType,
        verifierId,
        status: VerificationStatus.PENDING,
      },
    });

    // Construct the Presentation Definition (DIF Presentation Exchange standard)
    // This tells the EUDI Wallet exactly what kind of credential we need.
    const presentationDefinition = {
      id: `pd_${session.id}`,
      input_descriptors: [
        {
          id: `${requestedType.toLowerCase()}_descriptor`,
          name: `Request for ${requestedType}`,
          purpose: 'To verify the organizational status and LEI code.',
          format: {
            'vc+sd-jwt': {},
          },
          constraints: {
            fields: [
              {
                path: ['$.vct'],
                filter: {
                  type: 'string',
                  pattern: requestedType,
                },
              },
            ],
          },
        },
      ],
    };

    // Construct the OID4VP Authorization Request URL (Same-Device Flow)
    const clientId = 'VerifierWebApp';
    const responseUri = `http://localhost:3000/api/verifier/response/${session.id}`;

    // For a PoC, passing the presentation_definition by value in the URL is acceptable.
    const walletRequestUrl = `openid4vp://?client_id=${clientId}&response_type=vp_token&nonce=${nonce}&presentation_definition=${encodeURIComponent(JSON.stringify(presentationDefinition))}&response_uri=${encodeURIComponent(responseUri)}`;

    return {
      sessionId: session.id,
      nonce,
      walletRequestUrl,
      presentationDefinition,
    };
  }

  async getSessionById(sessionId: string, verifierId: string) {
    const session = await this.prisma.verificationSession.findFirst({
      where: {
        id: sessionId,
        verifierId,
      },
    });

    if (!session) {
      throw new NotFoundException('Verification session not found');
    }

    return session;
  }

  async getSessionsByVerifierId(verifierId: string) {
    return this.prisma.verificationSession.findMany({
      where: { verifierId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async verifyWalletResponse(sessionId: string, dto: WalletPresentationResponseDto) {
    const session = await this.prisma.verificationSession.findUnique({
      where: { id: sessionId },
    });

    if (!session || session.status !== VerificationStatus.PENDING) {
      throw new BadRequestException('Session not found or already processed');
    }

    try {
      //Verify and decode the SD-JWT
      const verifiedData = await this.verifySdJwt(dto.vp_token);

      // Validate the Verifiable Credential Type (vct)
      if (verifiedData.vct !== session.requestedType) {
        throw new BadRequestException(
          `Expected credential type ${session.requestedType}, but received ${verifiedData.vct}`,
        );
      }

      // Save the successfully verified data
      await this.prisma.verificationSession.update({
        where: { id: sessionId },
        data: {
          status: VerificationStatus.VERIFIED,
          presentedData: verifiedData.disclosedData, // Contains only the fields the user allowed to share
          holderDid: verifiedData.subjectDid,
        },
      });

      return {
        success: true,
        message: 'SD-JWT signature is valid. Selective disclosures verified successfully.',
      };
    } catch (error) {
      // If any cryptographic check fails, reject the session
      await this.prisma.verificationSession.update({
        where: { id: sessionId },
        data: { status: VerificationStatus.REJECTED },
      });
      throw error;
    }
  }

  //Helper method to parse and verify the SD-JWT format
  private async verifySdJwt(sdJwtToken: string) {
    //Split the token by tilde '~'
    const parts = sdJwtToken.split('~');

    // The first part is always the JWT signed by the Issuer
    const jwtPart = parts[0];
    const disclosures = parts.slice(1).filter(part => part.length > 0);
    const verifiedPayload = await this.verifyIssuerSignature(jwtPart);
    const sdHashesInPayload: string[] = verifiedPayload._sd || [];
    const disclosedData: Record<string, any> = {};

    // Verify each disclosure
    for (const disclosureB64url of disclosures) {
      const hash = crypto.createHash('sha256').update(disclosureB64url, 'ascii').digest();
      const hashB64url = hash.toString('base64url').replace(/=/g, '');

      if (!sdHashesInPayload.includes(hashB64url)) {
        console.log('Computed:', hashB64url);
        console.log('Allowed:', sdHashesInPayload);
        throw new BadRequestException(
          'Cryptographic mismatch: Disclosure hash not found in the signed SD-JWT payload',
        );
      }

      // Decode the disclosure to get the actual data
      const disclosureString = Buffer.from(disclosureB64url, 'base64url').toString('utf-8');
      let salt, key, value;
      try {
        [salt, key, value] = JSON.parse(disclosureString);
      } catch (e) {
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

  //Cryptographic verification of the Issuer's signature
  private async verifyIssuerSignature(rawJwt: string): Promise<any> {
    const parts = rawJwt.split('.');
    if (parts.length !== 3) {
      throw new BadRequestException('Invalid JWT format');
    }

    const [headerB64, payloadB64, signatureB64] = parts;
    const unsignedToken = `${headerB64}.${payloadB64}`;
    const signature = Buffer.from(signatureB64, 'base64url');

    const payloadStr = Buffer.from(payloadB64, 'base64url').toString('utf-8');
    const payload = JSON.parse(payloadStr);
    const issuerDid = payload.iss;

    // Find the Issuer's public key in the database
    const issuerDidDoc = await this.prisma.didDocument.findFirst({
      where: { did: issuerDid },
    });

    if (!issuerDidDoc) {
      throw new NotFoundException(`DID Document for issuer ${issuerDid} not found`);
    }

    let publicKeyObj: crypto.KeyObject;

    try {
      publicKeyObj = crypto.createPublicKey({
        key: issuerDidDoc.publicKey as any,
        format: 'jwk',
      });
    } catch (error) {
      throw new BadRequestException(
        'Failed to parse Issuer public key from DID Document. Ensure it is a valid JWK.',
      );
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
