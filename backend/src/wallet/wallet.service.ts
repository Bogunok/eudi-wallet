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
import * as bcrypt from 'bcrypt';

@Injectable()
export class WalletService {
  constructor(
    private prisma: PrismaService,
    private authService: AuthService
  ) {}

  // Метод створення DID для конкретного користувача
  async createDid(userId: string) {
    // пізніше буде генерація реальних крипто-ключів
    // Поки що імітуємо створення ключів
    const mockPrivateKey = 'private_key_' + uuidv4();
    const mockDid = 'did:key:' + uuidv4().substring(0, 8); // Наприклад: did:key:fj38f92

    // 2. Записуємо в базу даних
    const newDidDocument = await this.prisma.didDocument.create({
      data: {
        did: mockDid,
        method: 'key',
        privateKey: mockPrivateKey,
        userId: userId, // Прив'язуємо до користувача
      },
    });

    return newDidDocument;
  }

  // Метод отримати всі свої DID
  async getMyDids(userId: string) {
    return this.prisma.didDocument.findMany({
      where: { userId },
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

  // Зміна PIN-коду
  async changePin(userId: string, oldPin: string, newPin: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    if (!user.pin) {
      throw new BadRequestException('PIN-code for this user is not set');
    }

    // Перевірка старого PIN
    const isMatch = await bcrypt.compare(oldPin, user.pin);
    if (!isMatch) throw new UnauthorizedException('Old PIN is incorrect');

    // Хешування та збереження нового PIN
    const salt = await bcrypt.genSalt();
    const hashedPin = await bcrypt.hash(newPin, salt);

    return this.prisma.user.update({
      where: { id: userId },
      data: { pin: hashedPin, pinAttempts: 0 }, // Обнуляємо спроби при зміні
    });
  }
}
