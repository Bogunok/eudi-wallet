import { Test, TestingModule } from '@nestjs/testing';
import { VcService } from './vc.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';
import { DidService } from '../did/did.service';
import { NotificationService } from '../notification/notification.service';
import { ForbiddenException, NotFoundException } from '@nestjs/common';

const mockPrisma = {
  organization: {
    findFirst: jest.fn(),
  },
  verifiableCredential: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
  },
};

const mockAuthService = {};
const mockDidService = {};
const mockNotificationService = { create: jest.fn() };

describe('VcService', () => {
  let service: VcService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VcService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuthService, useValue: mockAuthService },
        { provide: DidService, useValue: mockDidService },
        { provide: NotificationService, useValue: mockNotificationService },
      ],
    }).compile();

    service = module.get<VcService>(VcService);
    jest.clearAllMocks();
  });

  describe('findAllCredentials', () => {
    it('should return credentials for valid organization', async () => {
      const org = { id: 'org-uuid', userId: 'user-uuid' };
      const credentials = [{ id: 'vc-1', type: ['VerifiableCredential', 'LEI'] }];

      mockPrisma.organization.findFirst.mockResolvedValue(org);
      mockPrisma.verifiableCredential.findMany.mockResolvedValue(credentials);

      const result = await service.findAllCredentials('org-uuid', 'user-uuid');
      expect(result).toEqual(credentials);
    });

    it('should throw ForbiddenException if organization does not belong to user', async () => {
      mockPrisma.organization.findFirst.mockResolvedValue(null);

      await expect(service.findAllCredentials('org-uuid', 'wrong-user')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('findAllCredentialsByUser', () => {
    it('should return all active credentials for user', async () => {
      const credentials = [{ id: 'vc-1', type: ['VerifiableCredential', 'LEI'], status: 'ACTIVE' }];
      mockPrisma.verifiableCredential.findMany.mockResolvedValue(credentials);

      const result = await service.findAllCredentialsByUser('user-uuid');
      expect(result).toEqual(credentials);
      expect(mockPrisma.verifiableCredential.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-uuid', status: 'ACTIVE' },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('findCredentialById', () => {
    it('should return credential if found', async () => {
      const credential = { id: 'vc-uuid', userId: 'user-uuid' };
      mockPrisma.verifiableCredential.findFirst.mockResolvedValue(credential);

      const result = await service.findCredentialById('vc-uuid', 'user-uuid');
      expect(result).toEqual(credential);
    });

    it('should throw NotFoundException if credential not found', async () => {
      mockPrisma.verifiableCredential.findFirst.mockResolvedValue(null);

      await expect(service.findCredentialById('nonexistent', 'user-uuid')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('deleteCredentialLocally', () => {
    it('should mark credential as DELETED', async () => {
      const credential = {
        id: 'vc-uuid',
        userId: 'user-uuid',
        type: ['VerifiableCredential', 'LEI'],
      };
      mockPrisma.verifiableCredential.findFirst.mockResolvedValue(credential);
      mockPrisma.verifiableCredential.update.mockResolvedValue({
        ...credential,
        status: 'DELETED',
      });
      mockNotificationService.create.mockResolvedValue({});

      const result = await service.deleteCredentialLocally('vc-uuid', 'user-uuid');

      expect(result.status).toBe('DELETED');
      expect(mockPrisma.verifiableCredential.update).toHaveBeenCalledWith({
        where: { id: 'vc-uuid' },
        data: { status: 'DELETED' },
      });
    });

    it('should throw NotFoundException if credential not found', async () => {
      mockPrisma.verifiableCredential.findFirst.mockResolvedValue(null);

      await expect(service.deleteCredentialLocally('nonexistent', 'user-uuid')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
