import { Module } from '@nestjs/common';
import { DidController } from './did.controller';
import { DidService } from './did.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [DidController],
  providers: [DidService],
  exports: [DidService],
})
export class DidModule {}
