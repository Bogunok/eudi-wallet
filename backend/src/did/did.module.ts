import { Module } from '@nestjs/common';
import { DidController } from './did.controller';
import { DidService } from './did.service';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  imports: [PrismaService],
  controllers: [DidController],
  providers: [DidService],
  exports: [DidService],
})
export class DidModule {}
