import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class DidService {
  constructor(private prisma: PrismaService) {}

  private readonly ALGORITHM = 'aes-256-gcm';
  private readonly SCRYPT_KEY_LEN = 32; // 32 байти = 256 біт для ключа AES

  //метод для створення даних DID документа
  async generateDidWebData(userId: string, pin: string, domain: string) {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
    const exportedPublicKey = publicKey.export({ format: 'jwk' });
    const privateKeyBuffer = privateKey.export({ format: 'der', type: 'pkcs8' });
    const privateKeyBase64 = privateKeyBuffer.toString('base64');

    // Формування did:web та Key ID
    const did = `did:web:${domain}`;
    const keyId = `${did}#key-1`;

    const jwkPublicKey = {
      ...exportedPublicKey,
      kid: keyId,
    };

    const encryptedData = await this.encryptWithPin(privateKeyBase64, pin);
    const savedDidDocument = await this.prisma.didDocument.create({
      data: {
        did,
        method: 'web',
        keyId,
        publicKey: jwkPublicKey,
        encryptedPrivateKey: encryptedData.encryptedText,
        encryptionSalt: encryptedData.salt,
        encryptionIv: encryptedData.iv,
        userId: userId,
      },
    });
    return savedDidDocument;
  }

  //Шифрує приватний ключ за допомогою PIN-коду користувача
  private async encryptWithPin(text: string, pin: string) {
    const salt = crypto.randomBytes(16);
    const iv = crypto.randomBytes(12);
    const key = crypto.scryptSync(pin, salt, this.SCRYPT_KEY_LEN);

    const cipher = crypto.createCipheriv(this.ALGORITHM, key, iv);

    let encrypted = cipher.update(text, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    const authTag = cipher.getAuthTag().toString('base64');

    return {
      encryptedText: `${encrypted}:${authTag}`,
      salt: salt.toString('base64'),
      iv: iv.toString('base64'),
    };
  }

  //Розшифровує приватний ключ за допомогою PIN-коду
  async decryptWithPin(
    encryptedDataWithTag: string,
    saltBase64: string,
    ivBase64: string,
    pin: string,
  ): Promise<string> {
    try {
      const salt = Buffer.from(saltBase64, 'base64');
      const iv = Buffer.from(ivBase64, 'base64');

      const key = crypto.scryptSync(pin, salt, this.SCRYPT_KEY_LEN);

      const [encryptedText, authTagBase64] = encryptedDataWithTag.split(':');

      if (!encryptedText || !authTagBase64) {
        throw new Error('Invalid encrypted data format in database');
      }

      const authTag = Buffer.from(authTagBase64, 'base64');

      const decipher = crypto.createDecipheriv(this.ALGORITHM, key, iv);

      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(encryptedText, 'base64', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      throw new Error('Unauthorized: Invalid PIN or corrupted key data');
    }
  }

  //Отримання публічного DID-документа
  async resolveDid(did: string) {
    const didDoc = await this.prisma.didDocument.findUnique({
      where: { did },
    });

    if (!didDoc) {
      throw new NotFoundException(`DID Document ${did} not found`);
    }

    const resolvedDocument: any = {
      '@context': [
        'https://www.w3.org/ns/did/v1',
        'https://w3id.org/security/suites/jws-2020/v1', // Контекст для JSON Web Keys
      ],
      id: didDoc.did,
      verificationMethod: [
        {
          id: didDoc.keyId,
          type: 'JsonWebKey2020',
          controller: didDoc.did,
          publicKeyJwk: didDoc.publicKey,
        },
      ],
      // може використовуватися для аутентифікації та підписів
      authentication: [didDoc.keyId],
      assertionMethod: [didDoc.keyId],
    };

    const documentMetadata = {
      created: didDoc.createdAt,
      deactivated: !!didDoc.deactivatedAt,
    };

    return {
      didDocument: resolvedDocument,
      didDocumentMetadata: documentMetadata,
    };
  }

  //Деактивація DID документа. встановлюємо час деактивації. тільки власник може деактивувати свій DID,
  //і він не може бути використаний для аутентифікації чи підписів після деактивації.
  async deactivateDid(did: string, userId: string) {
    const didDoc = await this.prisma.didDocument.findUnique({
      where: { did },
    });

    if (!didDoc) {
      throw new NotFoundException(`DID Document ${did} not found`);
    }

    if (didDoc.userId !== userId) {
      throw new ForbiddenException('You do not have permission to deactivate this DID');
    }

    if (didDoc.deactivatedAt) {
      throw new BadRequestException('This DID is already deactivated');
    }

    const updatedDoc = await this.prisma.didDocument.update({
      where: { did },
      data: { deactivatedAt: new Date() },
    });

    return {
      message: `DID ${did} successfully deactivated`,
      deactivatedAt: updatedDoc.deactivatedAt,
    };
  }
}
