import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  // викликається автоматично при запуску програми
  async onModuleInit() {
    await this.$connect();
  }

  // викликається при зупинці програми
  async onModuleDestroy() {
    await this.$disconnect();
  }
}