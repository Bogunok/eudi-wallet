import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './user/users.module';
import { WalletModule } from './wallet/wallet.module';
import { OrganizationModule } from './organization/organization.module';
import { CommonModule } from './common/common.module';
import { VcModule } from './vc/vc.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    UsersModule,
    WalletModule,
    OrganizationModule,
    CommonModule,
    VcModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
