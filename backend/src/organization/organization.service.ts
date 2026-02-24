import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { DidService } from 'src/did/did.service';

@Injectable()
export class OrganizationService {
  constructor(
    private prisma: PrismaService,
    private didService: DidService,
  ) {}

  async create(dto: CreateOrganizationDto, userId: string) {
    return this.prisma.organization.create({
      data: {
        lei: dto.lei,
        name: dto.name,
        country: dto.country,
        userId: userId,
      },
    });
  }

  // Метод для налаштування DID документа організації
  async setupOrganizationDid(userId: string, pin: string, domain: string) {
    return await this.didService.generateDidWebData(userId, pin, domain);
  }
}
