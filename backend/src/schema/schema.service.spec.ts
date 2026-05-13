import { Test, TestingModule } from '@nestjs/testing';
import { SchemaService } from './schema.service';
import { PrismaService } from '../prisma/prisma.service';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';

const mockPrisma = {
  verifiableCredentialSchema: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
  },
};

describe('SchemaService', () => {
  let service: SchemaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SchemaService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    service = module.get<SchemaService>(SchemaService);
    jest.clearAllMocks();
  });

  describe('createSchema', () => {
    const issuerId = 'issuer-uuid';
    const dto = {
      name: 'LEI',
      schemaId: 'custom:schema:lei:v1',
      structure: {
        type: 'object',
        properties: {
          legalName: { type: 'string' },
          country: { type: 'string' },
        },
        required: ['legalName', 'country'],
        additionalProperties: false,
      },
    };

    it('should create a schema successfully', async () => {
      mockPrisma.verifiableCredentialSchema.findFirst.mockResolvedValue(null);
      mockPrisma.verifiableCredentialSchema.create.mockResolvedValue({
        id: 'schema-uuid',
        ...dto,
        issuerId,
      });

      const result = await service.createSchema(dto, issuerId);

      expect(result.message).toBe('Schema successfully created');
      expect(result.schema).toHaveProperty('id');
      expect(mockPrisma.verifiableCredentialSchema.create).toHaveBeenCalledWith({
        data: { name: dto.name, schemaId: dto.schemaId, structure: dto.structure, issuerId },
      });
    });

    it('should throw BadRequestException if schemaId already exists', async () => {
      mockPrisma.verifiableCredentialSchema.findFirst.mockResolvedValue({ id: 'existing' });

      await expect(service.createSchema(dto, issuerId)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for invalid JSON Schema structure', async () => {
      const invalidDto = { ...dto, structure: { type: 'invalid-type' } as any };
      mockPrisma.verifiableCredentialSchema.findFirst.mockResolvedValue(null);

      await expect(service.createSchema(invalidDto, issuerId)).rejects.toThrow(BadRequestException);
    });
  });

  describe('deleteSchema', () => {
    const issuerId = 'issuer-uuid';
    const schemaId = 'schema-uuid';

    it('should delete schema successfully', async () => {
      mockPrisma.verifiableCredentialSchema.findUnique.mockResolvedValue({
        id: schemaId,
        issuerId,
        _count: { verifiableCredentialRequests: 0 },
      });
      mockPrisma.verifiableCredentialSchema.delete.mockResolvedValue({});

      const result = await service.deleteSchema(schemaId, issuerId);

      expect(result.message).toBe('Schema deleted successfully');
      expect(mockPrisma.verifiableCredentialSchema.delete).toHaveBeenCalledWith({
        where: { id: schemaId },
      });
    });

    it('should throw NotFoundException if schema not found', async () => {
      mockPrisma.verifiableCredentialSchema.findUnique.mockResolvedValue(null);

      await expect(service.deleteSchema(schemaId, issuerId)).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if schema belongs to another issuer', async () => {
      mockPrisma.verifiableCredentialSchema.findUnique.mockResolvedValue({
        id: schemaId,
        issuerId: 'other-issuer',
        _count: { verifiableCredentialRequests: 0 },
      });

      await expect(service.deleteSchema(schemaId, issuerId)).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException if schema has existing requests', async () => {
      mockPrisma.verifiableCredentialSchema.findUnique.mockResolvedValue({
        id: schemaId,
        issuerId,
        _count: { verifiableCredentialRequests: 3 },
      });

      await expect(service.deleteSchema(schemaId, issuerId)).rejects.toThrow(BadRequestException);
    });
  });

  describe('findSchemaById', () => {
    it('should return schema if found', async () => {
      const schema = { id: 'schema-uuid', name: 'LEI' };
      mockPrisma.verifiableCredentialSchema.findUnique.mockResolvedValue(schema);

      const result = await service.findSchemaById('schema-uuid');
      expect(result).toEqual(schema);
    });

    it('should throw NotFoundException if not found', async () => {
      mockPrisma.verifiableCredentialSchema.findUnique.mockResolvedValue(null);

      await expect(service.findSchemaById('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAllSchemasByIssuer', () => {
    it('should return schemas for issuer', async () => {
      const schemas = [
        { id: '1', name: 'LEI' },
        { id: '2', name: 'Tax Certificate' },
      ];
      mockPrisma.verifiableCredentialSchema.findMany.mockResolvedValue(schemas);

      const result = await service.findAllSchemasByIssuer('issuer-uuid');
      expect(result).toHaveLength(2);
    });
  });
});
