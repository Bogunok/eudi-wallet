import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { WalletModule } from './wallet/wallet.module';
import { OrganizationModule } from './organization/organization.module';
import { CommonModule } from './common/common.module';
import { VcModule } from './vc/vc.module';
import { UserModule } from './user/user.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { APP_GUARD } from '@nestjs/core';
import { SchemaModule } from './schema/schema.module';
import { IssuerModule } from './issuer/issuer.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    UserModule,
    WalletModule,
    OrganizationModule,
    CommonModule,
    VcModule,
    SchemaModule,
    IssuerModule,
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    AppService,
  ],
})
export class AppModule {}
