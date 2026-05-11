import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSchemaDto } from './dto/create-schema.dto';
import Ajv from 'ajv';

@Injectable()
export class SchemaService {
  private ajv = new Ajv();
  constructor(private prisma: PrismaService) {}

  async createSchema(dto: CreateSchemaDto, issuerId: string) {
    try {
      // Якщо структура написана з помилками, ajv кине помилку
      this.ajv.compile(dto.structure as object);
    } catch (error) {
      throw new BadRequestException(`Invalid JSON Schema format: ${error.message}`);
    }

    // Чи не існує вже схеми з таким ID
    const existingSchema = await this.prisma.verifiableCredentialSchema.findFirst({
      where: { schemaId: dto.schemaId },
    });

    if (existingSchema) {
      throw new BadRequestException(`Schema with ID ${dto.schemaId} already exists.`);
    }

    const newSchema = await this.prisma.verifiableCredentialSchema.create({
      data: {
        name: dto.name,
        schemaId: dto.schemaId,
        structure: dto.structure,
        issuerId: issuerId,
      },
    });

    return {
      message: 'Schema successfully created',
      schema: newSchema,
    };
  }

  async deleteSchema(id: string, issuerId: string) {
    const schema = await this.prisma.verifiableCredentialSchema.findUnique({
      where: { id },
      include: {
        _count: { select: { verifiableCredentialRequests: true } },
      },
    });

    if (!schema) {
      throw new NotFoundException(`Schema not found`);
    }

    if (schema.issuerId !== issuerId) {
      throw new ForbiddenException('You can only delete your own schemas');
    }

    // Не дозволяємо видаляти схему якщо є pending запити
    if (schema._count.verifiableCredentialRequests > 0) {
      throw new BadRequestException(
        'Cannot delete schema: there are existing credential requests linked to it.',
      );
    }

    await this.prisma.verifiableCredentialSchema.delete({ where: { id } });

    return { message: 'Schema deleted successfully' };
  }

  async findAllSchemasByIssuer(issuerId: string) {
    return this.prisma.verifiableCredentialSchema.findMany({
      where: { issuerId: issuerId },
      orderBy: { name: 'asc' },
    });
  }

  async findSchemaById(schemaId: string) {
    const schema = await this.prisma.verifiableCredentialSchema.findUnique({
      where: { id: schemaId },
    });

    if (!schema) {
      throw new NotFoundException(`Schema ID ${schemaId} not found`);
    }

    return schema;
  }

  async findAllAvailableSchemas() {
    return this.prisma.verifiableCredentialSchema.findMany({
      include: {
        issuer: {
          select: {
            id: true,
            email: true,
            organizations: { select: { name: true, lei: true } },
          },
        },
      },
      orderBy: { name: 'asc' },
    });
  }
}
