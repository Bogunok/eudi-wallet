import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';

@Injectable()
export class OrganizationService {
  constructor(private prisma: PrismaService) {}

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
}
