import { Module } from '@nestjs/common';
import { OrganizationService } from './organization.service';
import { OrganizationController } from './organization.controller';
import { DidModule } from 'src/did/did.module';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [PrismaModule, DidModule],
  providers: [OrganizationService],
  controllers: [OrganizationController],
})
export class OrganizationModule {}
