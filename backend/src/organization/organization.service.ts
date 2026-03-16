import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { DidService } from 'src/did/did.service';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { NotificationService } from 'src/notification/notification.service';
import { NotificationType } from '@prisma/client';

@Injectable()
export class OrganizationService {
  constructor(
    private prisma: PrismaService,
    private didService: DidService,
    private readonly notificationService: NotificationService,
  ) {}

  async create(dto: CreateOrganizationDto, userId: string) {
    const existingOrg = await this.prisma.organization.findFirst({ where: { userId } });
    if (existingOrg) {
      throw new BadRequestException('User already has an organization');
    }
    const newOrganization = await this.prisma.organization.create({
      data: {
        lei: dto.lei,
        name: dto.name,
        country: dto.country,
        userId: userId,
      },
    });

    await this.notificationService.create({
      userId: userId,
      title: 'Organization registered',
      message: `Your organization "${dto.name}" has been successfully linked to your wallet profile. You can now request credentials.`,
      type: NotificationType.SYSTEM,
    });

    return newOrganization;
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

    const updatedOrg = await this.prisma.organization.update({
      where: { id: org.id },
      data: {
        name: dto.name,
        country: dto.country,
      },
    });

    await this.notificationService.create({
      userId: userId,
      title: 'Organization updated',
      message: `The details for your organization "${updatedOrg.name}" have been successfully updated.`,
      type: NotificationType.SYSTEM,
    });

    return updatedOrg;
  }

  // Метод для налаштування DID документа організації
  async setupOrganizationDid(userId: string, pin: string, domain: string) {
    const didDocument = await this.didService.generateDidWebData(userId, pin, domain);

    await this.notificationService.create({
      userId: userId,
      title: 'Organization DID created',
      message: `Your organization's (DID) has been successfully generated and linked to ${domain}. Your company is now cryptographically active.`,
      type: NotificationType.SYSTEM,
    });

    return didDocument;
  }
}
