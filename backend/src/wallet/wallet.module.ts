import { Module } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { WalletController } from './wallet.controller';
import { PrismaModule } from '../prisma/prisma.module'; // Треба доступ до БД

@Module({
  imports: [PrismaModule], 
  controllers: [WalletController],
  providers: [WalletService],
})
export class WalletModule {}