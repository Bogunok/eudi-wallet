import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSchemaDto } from './dto/create-schema.dto';

@Injectable()
export class SchemaService {
  constructor(private prisma: PrismaService) {}

  async createSchema(dto: CreateSchemaDto, issuerId: string) {
    return this.prisma.verifiableCredentialSchema.create({
      data: {
        name: dto.name,
        schemaId: dto.schemaId,
        structure: dto.structure,
        issuerId: issuerId,
      },
    });
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
