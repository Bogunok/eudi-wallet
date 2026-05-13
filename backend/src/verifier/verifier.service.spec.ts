import { Test, TestingModule } from '@nestjs/testing';
import { VerifierService } from './verifier.service';
import { PrismaService } from '../prisma/prisma.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import * as crypto from 'crypto';

const mockPrisma = {
  verificationSession: {
    create: jest.fn(),
    update: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
  },
  user: {
    findMany: jest.fn(),
  },
  didDocument: {
    findFirst: jest.fn(),
  },
};

describe('VerifierService', () => {
  let service: VerifierService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [VerifierService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    service = module.get<VerifierService>(VerifierService);
    jest.clearAllMocks();
  });

  describe('createVerificationRequest', () => {
    it('should create a verification session with correct fields', async () => {
      const sessionId = 'session-uuid';
      mockPrisma.verificationSession.create.mockResolvedValue({
        id: sessionId,
        nonce: 'test-nonce',
      });
      mockPrisma.verificationSession.update.mockResolvedValue({});

      const result = await service.createVerificationRequest(
        'verifier-uuid',
        'LEI',
        ['lei', 'legalName'],
        'Opening a bank account',
      );

      expect(result).toHaveProperty('sessionId', sessionId);
      expect(result).toHaveProperty('walletRequestUrl');
      expect(result.walletRequestUrl).toContain('openid4vp://');
      expect(result.walletRequestUrl).toContain('response_type=vp_token');
      expect(result.presentationDefinition).toHaveProperty('input_descriptors');

      const descriptor = result.presentationDefinition.input_descriptors[0];
      expect(descriptor.constraints.limit_disclosure).toBe('required');
      // Перевіряємо що поля lei і legalName є в constraints
      const fieldPaths = descriptor.constraints.fields.map((f: any) => f.path[0]);
      expect(fieldPaths).toContain('$.lei');
      expect(fieldPaths).toContain('$.legalName');
    });

    it('should save walletRequestUrl to database', async () => {
      mockPrisma.verificationSession.create.mockResolvedValue({
        id: 'session-uuid',
        nonce: 'nonce',
      });
      mockPrisma.verificationSession.update.mockResolvedValue({});

      await service.createVerificationRequest('verifier-uuid', 'LEI', ['lei'], undefined);

      expect(mockPrisma.verificationSession.update).toHaveBeenCalledWith({
        where: { id: 'session-uuid' },
        data: { walletRequestUrl: expect.stringContaining('openid4vp://') },
      });
    });
  });

  describe('getSessionPublic', () => {
    it('should return public session details for PENDING session', async () => {
      mockPrisma.verificationSession.findUnique.mockResolvedValue({
        id: 'session-uuid',
        status: 'PENDING',
        requestedType: 'LEI',
        requestedFields: ['lei', 'legalName'],
        purpose: 'Bank account',
        createdAt: new Date(),
        verifier: {
          email: 'verifier@test.com',
          organizations: [{ name: 'PrivatBank', lei: '11111111112222222222' }],
        },
      });

      const result = await service.getSessionPublic('session-uuid');

      expect(result.sessionId).toBe('session-uuid');
      expect(result.requestedType).toBe('LEI');
      expect(result.requestedFields).toEqual(['lei', 'legalName']);
      expect(result.verifier.name).toBe('PrivatBank');
    });

    it('should throw NotFoundException for nonexistent session', async () => {
      mockPrisma.verificationSession.findUnique.mockResolvedValue(null);

      await expect(service.getSessionPublic('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for non-PENDING session', async () => {
      mockPrisma.verificationSession.findUnique.mockResolvedValue({
        id: 'session-uuid',
        status: 'VERIFIED',
        verifier: { email: 'v@t.com', organizations: [] },
      });

      await expect(service.getSessionPublic('session-uuid')).rejects.toThrow(BadRequestException);
    });
  });

  describe('getSessionById', () => {
    it('should return session for correct verifier', async () => {
      const session = { id: 'session-uuid', verifierId: 'verifier-uuid' };
      mockPrisma.verificationSession.findFirst.mockResolvedValue(session);

      const result = await service.getSessionById('session-uuid', 'verifier-uuid');
      expect(result).toEqual(session);
    });

    it('should throw NotFoundException if session not found or wrong verifier', async () => {
      mockPrisma.verificationSession.findFirst.mockResolvedValue(null);

      await expect(service.getSessionById('session-uuid', 'wrong-verifier')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getTrustedVerifiers', () => {
    it('should return list of verifiers with organization info', async () => {
      mockPrisma.user.findMany.mockResolvedValue([
        {
          id: 'v1',
          email: 'bank@test.com',
          organizations: [{ name: 'PrivatBank', lei: '11111111112222222222' }],
        },
        {
          id: 'v2',
          email: 'noorg@test.com',
          organizations: [],
        },
      ]);

      const result = await service.getTrustedVerifiers();

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('PrivatBank');
      expect(result[1].name).toBe('noorg@test.com'); // fallback to email
    });
  });

  describe('verifyWalletResponse', () => {
    it('should throw BadRequestException if session not found', async () => {
      mockPrisma.verificationSession.findUnique.mockResolvedValue(null);

      await expect(
        service.verifyWalletResponse('nonexistent', {
          vp_token: 'token',
          presentation_submission: {
            id: 'test-submission',
            definition_id: 'pd_test',
            descriptor_map: [{ id: 'lei_descriptor', format: 'vc+sd-jwt', path: '$' }],
          },
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if session already processed', async () => {
      mockPrisma.verificationSession.findUnique.mockResolvedValue({
        id: 'session-uuid',
        status: 'VERIFIED',
        requestedFields: ['lei'],
      });

      await expect(
        service.verifyWalletResponse('session-uuid', {
          vp_token: 'token',
          presentation_submission: {
            id: 'test-submission',
            definition_id: 'pd_test',
            descriptor_map: [{ id: 'lei_descriptor', format: 'vc+sd-jwt', path: '$' }],
          },
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
