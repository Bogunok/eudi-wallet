import { Test, TestingModule } from '@nestjs/testing';
import { OrganizationService } from './organization.service';
import { PrismaService } from '../prisma/prisma.service';
import { DidService } from '../did/did.service';
import { NotificationService } from '../notification/notification.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';

const mockPrisma = {
  organization: {
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  verifiableCredential: {
    updateMany: jest.fn(),
  },
};

const mockDidService = {
  generateDidWebData: jest.fn(),
};

const mockNotificationService = {
  create: jest.fn(),
};

describe('OrganizationService', () => {
  let service: OrganizationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrganizationService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: DidService, useValue: mockDidService },
        { provide: NotificationService, useValue: mockNotificationService },
      ],
    }).compile();

    service = module.get<OrganizationService>(OrganizationService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    const userId = 'user-uuid';
    const dto = { lei: '12345678901234567890', name: 'Test Org', country: 'UA' };

    it('should create organization successfully', async () => {
      mockPrisma.organization.findFirst.mockResolvedValue(null);
      mockPrisma.organization.create.mockResolvedValue({ id: 'org-uuid', ...dto, userId });
      mockPrisma.verifiableCredential.updateMany.mockResolvedValue({ count: 1 });
      mockNotificationService.create.mockResolvedValue({});

      const result = await service.create(dto, userId);

      expect(result).toHaveProperty('id', 'org-uuid');
      expect(mockPrisma.organization.create).toHaveBeenCalledWith({
        data: { lei: dto.lei, name: dto.name, country: dto.country, userId },
      });
      // Перевіряємо що LEI Credential прив'язується до організації
      expect(mockPrisma.verifiableCredential.updateMany).toHaveBeenCalledWith({
        where: { userId, organizationId: null },
        data: { organizationId: 'org-uuid' },
      });
    });

    it('should throw BadRequestException if user already has organization', async () => {
      mockPrisma.organization.findFirst.mockResolvedValue({ id: 'existing-org' });

      await expect(service.create(dto, userId)).rejects.toThrow(BadRequestException);
    });
  });

  describe('findMyOrganization', () => {
    it('should return organization if found', async () => {
      const org = { id: 'org-uuid', name: 'Test Org' };
      mockPrisma.organization.findFirst.mockResolvedValue(org);

      const result = await service.findMyOrganization('user-uuid');
      expect(result).toEqual(org);
    });

    it('should throw NotFoundException if organization not found', async () => {
      mockPrisma.organization.findFirst.mockResolvedValue(null);

      await expect(service.findMyOrganization('user-uuid')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateMyOrganization', () => {
    const userId = 'user-uuid';
    const existingOrg = {
      id: 'org-uuid',
      lei: '12345678901234567890',
      name: 'Old Name',
      country: 'UA',
    };

    it('should update name and country successfully', async () => {
      mockPrisma.organization.findFirst.mockResolvedValue(existingOrg);
      mockPrisma.organization.update.mockResolvedValue({
        ...existingOrg,
        name: 'New Name',
        country: 'PL',
      });
      mockNotificationService.create.mockResolvedValue({});

      const result = await service.updateMyOrganization(userId, {
        name: 'New Name',
        country: 'PL',
      });

      expect(result.name).toBe('New Name');
      expect(result.country).toBe('PL');
    });

    it('should throw BadRequestException if trying to change LEI', async () => {
      mockPrisma.organization.findFirst.mockResolvedValue(existingOrg);

      await expect(
        service.updateMyOrganization(userId, {
          lei: 'different-lei-12345678',
          name: 'Test',
          country: 'UA',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('setupOrganizationDid', () => {
    it('should create DID for organization', async () => {
      const didDoc = { id: 'did-uuid', did: 'did:web:example.com' };
      mockDidService.generateDidWebData.mockResolvedValue(didDoc);
      mockNotificationService.create.mockResolvedValue({});

      const result = await service.setupOrganizationDid('user-uuid', '1234', 'example.com');

      expect(result).toEqual(didDoc);
      expect(mockDidService.generateDidWebData).toHaveBeenCalledWith(
        'user-uuid',
        '1234',
        'example.com',
      );
    });
  });
});
