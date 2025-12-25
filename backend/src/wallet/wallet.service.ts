import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { v4 as uuidv4 } from 'uuid'; // Можливо доведеться зробити npm i uuid

@Injectable()
export class WalletService {
  constructor(private prisma: PrismaService) {}

  // Метод створення DID для конкретного користувача
  async createDid(userId: string) {
    // 1. Тут пізніше буде генерація реальних крипто-ключів
    // Поки що імітуємо створення ключів
    const mockPrivateKey = 'private_key_' + uuidv4();
    const mockDid = 'did:key:' + uuidv4().substring(0, 8); // Наприклад: did:key:fj38f92

    // 2. Записуємо в базу даних
    const newDidDocument = await this.prisma.didDocument.create({
      data: {
        did: mockDid,
        method: 'key',
        privateKey: mockPrivateKey,
        userId: userId, // Прив'язуємо до нашого користувача
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
}