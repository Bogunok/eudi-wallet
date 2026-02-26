import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { v4 as uuidv4 } from 'uuid'; // Можливо доведеться зробити npm i uuid
import { AuthService } from 'src/auth/auth.service';
import { DidService } from 'src/did/did.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class WalletService {
  constructor(
    private prisma: PrismaService,
    private authService: AuthService,
    private didService: DidService,
  ) {}

  // Метод створення DID для конкретного користувача
  async createDid(userId: string, pin: string) {
    const domain = process.env.APP_DOMAIN || 'localhost:3000';
    const userDidDomain = `${domain}:user:${userId}`;
    const newDidDocument = await this.didService.generateDidWebData(userId, pin, userDidDomain);

    return newDidDocument;
  }

  // Метод отримати всі свої DID
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
  }

  //Скидання гаманця (Reset wallet)
  async resetWallet(userId: string) {
    // Видаляємо всі DID та документи користувача, але залишаємо акаунт
    return this.prisma.$transaction([
      this.prisma.didDocument.deleteMany({ where: { userId } }),
      this.prisma.verifiableCredential.deleteMany({
        where: { organization: { userId } },
      }),
    ]);
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

    return this.prisma.user.update({
      where: { id: userId },
      data: { pin: hashedPin, pinAttempts: 0 },
    });
  }
}
