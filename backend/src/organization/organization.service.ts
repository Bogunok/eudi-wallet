import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { DidService } from 'src/did/did.service';
import { UpdateOrganizationDto } from './dto/update-organization.dto';

@Injectable()
export class OrganizationService {
  constructor(
    private prisma: PrismaService,
    private didService: DidService,
  ) {}

  async create(dto: CreateOrganizationDto, userId: string) {
    const existingOrg = await this.prisma.organization.findFirst({ where: { userId } });
    if (existingOrg) {
      throw new BadRequestException('User already has an organization');
    }
    return this.prisma.organization.create({
      data: {
        lei: dto.lei,
        name: dto.name,
        country: dto.country,
        userId: userId,
      },
    });
  }

  async findMyOrganization(userId: string) {
    const org = await this.prisma.organization.findFirst({
      where: { userId },
    });

    if (!org) {
      throw new NotFoundException('Organization profile not found');
    }

    return org;
  }

  async updateMyOrganization(userId: string, dto: UpdateOrganizationDto) {
    const org = await this.findMyOrganization(userId);

    // забороняємо змінювати LEI
    if (dto.lei && dto.lei !== org.lei) {
      throw new BadRequestException(
        'LEI cannot be changed. Please contact support if you need to update it.',
      );
    }

    return this.prisma.organization.update({
      where: { id: org.id },
      data: {
        name: dto.name,
        country: dto.country,
      },
    });
  }

  // Метод для налаштування DID документа організації
  async setupOrganizationDid(userId: string, pin: string, domain: string) {
    return await this.didService.generateDidWebData(userId, pin, domain);
  }
}
