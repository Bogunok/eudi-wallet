import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';
import { RequestStatus, VerifiableCredentialStatus } from '@prisma/client';
import { DidService } from '../did/did.service';
import { RequestCredentialDto } from './dto/request-credential.dto';

@Injectable()
export class VcService {
  constructor(
    private prisma: PrismaService,
    private authService: AuthService,
    private didService: DidService,
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

    return this.prisma.verifiableCredential.update({
      where: { id: credential.id },
      data: { status: VerifiableCredentialStatus.DELETED },
    });
  }

  //Створення заявки на документ
  async requestCredentialFromIssuer(dto: RequestCredentialDto, holderId: string) {
    // Перевіряємо, чи існує така схема взагалі
    const schema = await this.prisma.verifiableCredentialSchema.findUnique({
      where: { id: dto.schemaId },
    });
    if (!schema) throw new NotFoundException('Verifiable credential schema not found');

    return this.prisma.verifiableCredentialRequest.create({
      data: {
        holderId: holderId,
        issuerId: dto.issuerId,
        schemaId: dto.schemaId,
        claimData: dto.claimData,
        status: RequestStatus.PENDING,
      },
    });
  }
}
