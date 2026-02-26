import { Module } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { WalletController } from './wallet.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { DidModule } from 'src/did/did.module';

@Module({
  imports: [PrismaModule, AuthModule, DidModule],
  controllers: [WalletController],
  providers: [WalletService],
})
export class WalletModule {}
