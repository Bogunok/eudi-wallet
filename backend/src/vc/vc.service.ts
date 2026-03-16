import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';
import { RequestStatus, VerifiableCredentialStatus } from '@prisma/client';
import { DidService } from '../did/did.service';
import { RequestCredentialDto } from './dto/request-credential.dto';
import { NotificationService } from 'src/notification/notification.service';
import { NotificationType } from '@prisma/client';

@Injectable()
export class VcService {
  constructor(
    private prisma: PrismaService,
    private authService: AuthService,
    private didService: DidService,
    private readonly notificationService: NotificationService,
  ) {}

  //Отримати список усіх активних документів для екрана гаманця
  async findAllCredentials(organizationId: string, userId: string) {
    // Перевірка прав доступу перед поверненням списку
    const org = await this.prisma.organization.findFirst({
      where: { id: organizationId, userId },
    });
    if (!org) throw new ForbiddenException('Access denied');

    return this.prisma.verifiableCredential.findMany({
      where: {
        organizationId,
        status: VerifiableCredentialStatus.ACTIVE,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  //Детальний перегляд конкретного документа
  async findCredentialById(id: string, userId: string) {
    const credential = await this.prisma.verifiableCredential.findFirst({
      where: {
        id: id,
        userId: userId,
      },
    });

    if (!credential) {
      throw new NotFoundException('Document not found in wallet');
    }

    return credential;
  }

  //Локальне видалення документа
  async deleteCredentialLocally(id: string, userId: string) {
    const credential = await this.findCredentialById(id, userId);

    const deletedCredential = await this.prisma.verifiableCredential.update({
      where: { id: credential.id },
      data: { status: VerifiableCredentialStatus.DELETED },
    });

    const documentName =
      credential.type && credential.type.length > 1 ? credential.type[1] : 'Credential';

    await this.notificationService.create({
      userId: userId,
      title: 'Document removed',
      message: `Document "${documentName}" has been successfully removed from your wallet.`,
      type: NotificationType.SYSTEM,
    });

    return deletedCredential;
  }

  //Створення заявки на документ
  async requestCredentialFromIssuer(dto: RequestCredentialDto, holderId: string) {
    // Перевіряємо, чи існує така схема взагалі
    const schema = await this.prisma.verifiableCredentialSchema.findUnique({
      where: { id: dto.schemaId },
    });
    if (!schema) throw new NotFoundException('Verifiable credential schema not found');

    const request = await this.prisma.verifiableCredentialRequest.create({
      data: {
        holderId: holderId,
        issuerId: dto.issuerId,
        schemaId: dto.schemaId,
        claimData: dto.claimData,
        status: RequestStatus.PENDING,
      },
    });

    await this.notificationService.create({
      userId: holderId,
      title: 'Request submitted',
      message: `Your application for the "${schema.name}" document has been successfully submitted to the issuer. You will be notified once it is reviewed.`,
      type: NotificationType.ISSUANCE,
    });

    return request;
  }
}
