import { Module } from '@nestjs/common';
import { VcService } from './vc.service';
import { VcController } from './vc.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { DidModule } from 'src/did/did.module';

@Module({
  imports: [PrismaModule, AuthModule, DidModule],
  controllers: [VcController],
  providers: [VcService],
  exports: [VcService],
})
export class VcModule {}
