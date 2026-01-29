import { Injectable, NotFoundException, ForbiddenException, BadRequestException} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';
import { CreateCredentialDto } from './dto/create-credential.dto';
import { v4 as uuidv4 } from 'uuid';
import { VerifiableCredentialStatus } from '@prisma/client';

@Injectable()
export class VcService {
  constructor(
    private prisma: PrismaService,
    private authService: AuthService, 
  ) {}

  // Метод видачі та збереження Verifiable Credential
  async issueAndSaveCredential(dto: CreateCredentialDto, userId: string) {
    // Перевірка власності організації
    const organization = await this.prisma.organization.findFirst({
      where: { 
        id: dto.organizationId,
        userId: userId 
      },
    });

    if (!organization) {
      throw new ForbiddenException('У вас немає доступу до цієї організації');
    }

    // Валідація PIN-коду 
    await this.authService.loginWithPin({ 
      email: dto.email, 
      pin: dto.pin 
    });

    // Формування структури Verifiable Credential (JSON-LD)
    const vcPayload = {
      "@context": ["https://www.w3.org/2018/credentials/v1"],
      "type": ["VerifiableCredential", "LegalEntityIdentifierCredential"],
      "credentialSubject": {
        "lei": dto.orgData.lei,
        "name": dto.orgData.name,
        "country": dto.orgData.country,
      }
    };

    // Запис у базу 
    return this.prisma.verifiableCredential.create({
      data: {
        type: ['VerifiableCredential', 'LegalEntityIdentifierCredential'],
        issuerDid: 'did:key:z6Mkq5C98S8pX97G2f3y', // DID емітента
        subjectDid: `did:key:${uuidv4().substring(0, 15)}`, // DID організації
        payload: vcPayload, // Поле payload замість content
        rawJwt: "eyJhbGciOiJFZERTQSIs...", // Імітація підписаного JWT 
        issuedAt: new Date(), 
        status: 'ACTIVE', 
        userId: userId, // Зв'язок з власником гаманця
        organizationId: dto.organizationId, // Зв'язок з організацією
      },
    });
  }

  //Отримати список усіх активних документів для екрана гаманця
   
  async findAllCredentials(organizationId: string, userId: string) {
    // Перевірка прав доступу перед поверненням списку
    const org = await this.prisma.organization.findFirst({
      where: { id: organizationId, userId }
    });
    if (!org) throw new ForbiddenException('Доступ заборонено');

    return this.prisma.verifiableCredential.findMany({
      where: { 
        organizationId, 
        status: 'ACTIVE' 
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  //Детальний перегляд конкретного документа
  async findCredentialById(id: string) {
    const credential = await this.prisma.verifiableCredential.findUnique({
      where: { id },
    });

    if (!credential) {
      throw new NotFoundException('Документ не знайдено в гаманці');
    }

    return credential;
  }

  //Локальне видалення документа
  async deleteCredentialLocally(id: string) {
    return this.prisma.verifiableCredential.update({
      where: { id },
      data: { status: VerifiableCredentialStatus.DELETED }, // Міняємо статус, щоб зберегти цілісність даних
    });
  }
}