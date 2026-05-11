import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';
import { VerifiableCredentialStatus } from '@prisma/client';
import { DidService } from '../did/did.service';
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

  async findAllCredentials(organizationId: string, userId: string) {
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

  // Отримати всі активні документи по userId — для випадку коли організації ще немає
  // (наприклад LEI Credential виданий до створення організації)
  async findAllCredentialsByUser(userId: string) {
    return this.prisma.verifiableCredential.findMany({
      where: {
        userId,
        status: VerifiableCredentialStatus.ACTIVE,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findCredentialById(id: string, userId: string) {
    const credential = await this.prisma.verifiableCredential.findFirst({
      where: { id, userId },
    });

    if (!credential) {
      throw new NotFoundException('Document not found in wallet');
    }

    return credential;
  }

  async findByIssuerDid(issuerDid: string) {
    return this.prisma.verifiableCredential.findMany({
      where: { issuerDid },
      include: {
        organization: { select: { name: true, lei: true } },
        user: { select: { email: true } },
      },
      orderBy: { issuedAt: 'desc' },
    });
  }

  async deleteCredentialLocally(id: string, userId: string) {
    const credential = await this.findCredentialById(id, userId);

    const deletedCredential = await this.prisma.verifiableCredential.update({
      where: { id: credential.id },
      data: { status: VerifiableCredentialStatus.DELETED },
    });

    const documentName =
      credential.type && credential.type.length > 1 ? credential.type[1] : 'Credential';

    await this.notificationService.create({
      userId,
      title: 'Document removed',
      message: `Document "${documentName}" has been successfully removed from your wallet.`,
      type: NotificationType.SYSTEM,
    });

    return deletedCredential;
  }
}
