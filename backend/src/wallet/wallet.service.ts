import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { HttpService } from '@nestjs/axios';
import { AuthService } from 'src/auth/auth.service';
import { DidService } from 'src/did/did.service';
import * as bcrypt from 'bcrypt';
import { lastValueFrom } from 'rxjs';
import { SignDocumentDto } from './dto/sign-document.dto';
import * as crypto from 'crypto';
import { NotificationService } from 'src/notification/notification.service';
import { NotificationType, RequestStatus } from '@prisma/client';
import { RequestCredentialDto } from './dto/request-credential.dto';

@Injectable()
export class WalletService {
  private readonly logger = new Logger(WalletService.name);

  constructor(
    private prisma: PrismaService,
    private authService: AuthService,
    private didService: DidService,
    private readonly httpService: HttpService,
    private readonly notificationService: NotificationService,
  ) {}

  // Метод створення DID для конкретного користувача
  /*async createDid(userId: string, pin: string) {
    const domain = process.env.APP_DOMAIN || 'localhost:3000';
    const userDidDomain = `${domain}:user:${userId}`;
    const newDidDocument = await this.didService.generateDidWebData(userId, pin, userDidDomain);

    await this.notificationService.create({
      userId: userId,
      title: 'DID generated',
      message: 'Your unique DID was successfully created.',
      type: NotificationType.SYSTEM,
    });

    return newDidDocument;
  }

  async getMyDids(userId: string) {
    return this.prisma.didDocument.findMany({
      where: { userId },
      select: {
        id: true,
        did: true,
        method: true,
        keyId: true,
        publicKey: true,
        createdAt: true,
        deactivatedAt: true,
      },
    });
  }*/

  async resetWallet(userId: string) {
    const transactionResult = await this.prisma.$transaction([
      this.prisma.didDocument.deleteMany({ where: { userId } }),
      this.prisma.verifiableCredential.deleteMany({
        where: { organization: { userId } },
      }),
    ]);

    await this.notificationService.create({
      userId: userId,
      title: 'Wallet Reset Successful',
      message:
        'Your wallet has been completely reset. All DIDs and credentials have been securely deleted.',
      type: NotificationType.SYSTEM,
    });

    return transactionResult;
  }

  async changePin(userId: string, oldPin: string, newPin: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    if (!user.pin) {
      throw new BadRequestException('PIN-code for this user is not set');
    }

    // Перевірка старого PIN
    const isMatch = await bcrypt.compare(oldPin, user.pin);
    if (!isMatch) throw new UnauthorizedException('Old PIN is incorrect');

    // Знаходимо всі DID документи користувача
    const userDids = await this.prisma.didDocument.findMany({
      where: { userId },
    });

    const updatePromises = userDids.map(async didDoc => {
      // Розшифровуємо старим пін-кодом
      const decryptedPrivateKey = await this.didService.decryptWithPin(
        didDoc.encryptedPrivateKey,
        didDoc.encryptionSalt,
        didDoc.encryptionIv,
        oldPin,
      );

      // Шифруємо НОВИМ пін-кодом
      const reEncryptedData = await this.didService.encryptWithPin(decryptedPrivateKey, newPin);

      return this.prisma.didDocument.update({
        where: { id: didDoc.id },
        data: {
          encryptedPrivateKey: reEncryptedData.encryptedText,
          encryptionSalt: reEncryptedData.salt,
          encryptionIv: reEncryptedData.iv,
        },
      });
    });

    await Promise.all(updatePromises);

    // Хешування та збереження нового PIN у User
    const salt = await bcrypt.genSalt();
    const hashedPin = await bcrypt.hash(newPin, salt);

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: { pin: hashedPin, pinAttempts: 0 },
    });

    await this.notificationService.create({
      userId: userId,
      title: 'PIN Code Updated',
      message:
        'Your wallet PIN code has been successfully changed. Please keep your new PIN secure.',
      type: NotificationType.SYSTEM,
    });

    return updatedUser;
  }

  //Створення заявки на документ
  async requestCredentialFromIssuer(dto: RequestCredentialDto, holderId: string) {
    // Перевіряємо, чи існує така схема взагалі
    const schema = await this.prisma.verifiableCredentialSchema.findUnique({
      where: { id: dto.schemaId },
    });
    if (!schema) throw new NotFoundException('Verifiable credential schema not found');

    const request = await this.prisma.verifiableCredentialRequest.create({
      data: {
        holderId: holderId,
        issuerId: dto.issuerId,
        schemaId: dto.schemaId,
        claimData: dto.claimData,
        status: RequestStatus.PENDING,
      },
    });

    await this.notificationService.create({
      userId: holderId,
      title: 'Request submitted',
      message: `Your application for the "${schema.name}" document has been successfully submitted to the issuer. You will be notified once it is reviewed.`,
      type: NotificationType.ISSUANCE,
    });

    return request;
  }

  //Обрізає SD-JWT, залишаючи тільки ті поля, які дозволив користувач, і відправляє результат Верифікатору.
  async presentCredentialToVerifier(
    userId: string,
    credentialId: string,
    sessionId: string,
    allowedClaims: string[],
  ) {
    const credential = await this.prisma.verifiableCredential.findFirst({
      where: { id: credentialId, userId: userId },
    });

    if (!credential) {
      throw new NotFoundException('Verifiable Credential not found in your wallet');
    }

    // повний SD-JWT з усіма даними
    const rawSdJwt = credential.rawJwt;

    // Selective Disclosure
    const parts = rawSdJwt.split('~');
    const signedJwt = parts[0];
    const disclosures = parts.slice(1).filter(part => part.length > 0);

    const keptDisclosures: string[] = [];

    // Перебираємо всі прикріплені дані
    for (const disclosureB64url of disclosures) {
      try {
        const decodedString = Buffer.from(disclosureB64url, 'base64url').toString('utf-8');
        const parsedDisclosure = JSON.parse(decodedString);

        if (Array.isArray(parsedDisclosure) && parsedDisclosure.length === 3) {
          const claimName = parsedDisclosure[1];

          if (allowedClaims.includes(claimName)) {
            keptDisclosures.push(disclosureB64url);
          }
        }
      } catch (error) {
        this.logger.warn('Failed to parse a disclosure segment');
      }
    }

    // Склеюємо назад підписаний JWT + тільки дозволені розкриття + обов'язкова тильда в кінці
    const croppedSdJwt = `${signedJwt}~${keptDisclosures.join('~')}~`;

    const presentationSubmission = {
      id: crypto.randomUUID(),
      definition_id: `pd_${sessionId}`, // ID запиту, який генерував Верифікатор
      descriptor_map: [
        {
          id: `${credential.type[1].toLowerCase()}_descriptor`,
          format: 'vc+sd-jwt',
          path: '$',
        },
      ],
    };

    const documentName =
      credential.type && credential.type.length > 1 ? credential.type[1] : 'Credential';

    // HTTP Запит до Верифікатора
    try {
      const verifierUrl = `http://localhost:3000/verifier/response/${sessionId}`;

      const payload = {
        vp_token: croppedSdJwt,
        presentation_submission: presentationSubmission,
      };

      const response = await lastValueFrom(this.httpService.post(verifierUrl, payload));

      await this.notificationService.create({
        userId: userId,
        title: 'Data shared successfully',
        message: `Your selectively disclosed data from "${documentName}" was successfully verified and accepted by the requesting party.`,
        type: NotificationType.VERIFICATION,
      });

      return {
        message: 'Presentation successfully submitted to the Verifier',
        verifierResponse: response.data,
      };
    } catch (error) {
      this.logger.error(`Failed to send presentation to verifier: ${error.message}`);

      const errorMessage = error.response?.data?.message || error.message;

      await this.notificationService.create({
        userId: userId,
        title: 'Verification failed',
        message: `The requesting party rejected your "${documentName}" presentation. Reason: ${errorMessage}.`,
        type: NotificationType.WARNING,
      });

      if (error.response) {
        throw new InternalServerErrorException(
          `Verifier rejected the presentation: ${errorMessage}`,
        );
      }
      throw new InternalServerErrorException('Network error: Could not reach the Verifier');
    }
  }

  async signDocument(userId: string, dto: SignDocumentDto) {
    // Перевіряємо, чи існує LEI-документ і чи належить він цьому користувачу
    const credential = await this.prisma.verifiableCredential.findFirst({
      where: {
        id: dto.credentialId,
        userId: userId,
      },
    });

    if (!credential) {
      throw new BadRequestException('Credential not found or does not belong to you');
    }

    const didDocument = await this.prisma.didDocument.findFirst({
      where: { userId },
    });

    if (!didDocument) {
      throw new BadRequestException('DID Document not found. Please create a wallet first.');
    }

    // Розшифровуємо приватний ключ за допомогою ПІН-коду
    let decryptedPrivateKeyBase64: string;
    try {
      decryptedPrivateKeyBase64 = await this.didService.decryptWithPin(
        didDocument.encryptedPrivateKey,
        didDocument.encryptionSalt,
        didDocument.encryptionIv,
        dto.pin,
      );
    } catch (error) {
      throw new UnauthorizedException('Invalid PIN code');
    }

    const privateKeyObj = crypto.createPrivateKey({
      key: Buffer.from(decryptedPrivateKeyBase64, 'base64'),
      format: 'der',
      type: 'pkcs8',
    });

    // Рахуємо хеш документа
    const documentHash = crypto.createHash('sha256').update(dto.documentText).digest();

    // Створюємо цифровий підпис (EdDSA)
    const signature = crypto.sign(null, documentHash, privateKeyObj);

    const documentName =
      credential.type && credential.type.length > 1 ? credential.type[1] : 'Credential';

    await this.notificationService.create({
      userId: userId,
      title: 'Document signed successfully',
      message: `You have successfully applied a Qualified Electronic Seal (QES) to a document using your "${documentName}".`,
      type: NotificationType.SYSTEM,
    });

    return {
      success: true,
      message: 'Qualified Electronic Seal created successfully',
      signatureData: {
        signedByDid: didDocument.did,
        attachedCredentialId: credential.id,
        documentHash: documentHash.toString('hex'),
        signature: signature.toString('base64'),
        timestamp: new Date().toISOString(),
      },
    };
  }
}
