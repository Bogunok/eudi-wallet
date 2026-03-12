import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
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
}
