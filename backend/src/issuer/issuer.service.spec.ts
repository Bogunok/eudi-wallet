import { Test, TestingModule } from '@nestjs/testing';
import { IssuerService } from './issuer.service';
import { PrismaService } from '../prisma/prisma.service';
import { DidService } from '../did/did.service';
import { GleifMockService } from './gleif-mock.service';
import { NotificationService } from '../notification/notification.service';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';

const mockPrisma = {
  verifiableCredentialRequest: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
  },
  organization: {
    findFirst: jest.fn(),
  },
  didDocument: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
  },
  verifiableCredential: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    findMany: jest.fn(),
  },
  user: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
  },
  revocationRequest: {
    findUnique: jest.fn(),
    update: jest.fn(),
    findMany: jest.fn(),
  },
  verifiableCredentialSchema: {
    findFirst: jest.fn(),
  },
};

const mockDidService = {
  decryptWithPin: jest.fn(),
};

const mockGleifMock = {
  verifyOrganization: jest.fn(),
};

const mockNotificationService = {
  create: jest.fn(),
};

describe('IssuerService', () => {
  let service: IssuerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IssuerService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: DidService, useValue: mockDidService },
        { provide: GleifMockService, useValue: mockGleifMock },
        { provide: NotificationService, useValue: mockNotificationService },
      ],
    }).compile();

    service = module.get<IssuerService>(IssuerService);
    jest.clearAllMocks();
  });

  describe('approveRequestAndIssue', () => {
    const issuerId = 'issuer-uuid';
    const requestId = 'request-uuid';

    const baseRequest = {
      id: requestId,
      issuerId,
      holderId: 'holder-uuid',
      status: 'PENDING',
      claimData: { legalName: 'Test Org', country: 'UA' },
      schema: {
        name: 'LEI',
        structure: {
          type: 'object',
          properties: {
            legalName: { type: 'string' },
            country: { type: 'string' },
          },
          required: ['legalName', 'country'],
          additionalProperties: false,
        },
      },
    };

    it('should throw ForbiddenException if request not found', async () => {
      mockPrisma.verifiableCredentialRequest.findUnique.mockResolvedValue(null);

      await expect(
        service.approveRequestAndIssue(requestId, issuerId, {
          pin: '1234',
          assignedLei: 'A'.repeat(20),
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException if request belongs to another issuer', async () => {
      mockPrisma.verifiableCredentialRequest.findUnique.mockResolvedValue({
        ...baseRequest,
        issuerId: 'other-issuer',
      });

      await expect(
        service.approveRequestAndIssue(requestId, issuerId, { pin: '1234' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException if request already processed', async () => {
      mockPrisma.verifiableCredentialRequest.findUnique.mockResolvedValue({
        ...baseRequest,
        status: 'APPROVED',
      });
      mockPrisma.organization.findFirst.mockResolvedValue(null);

      await expect(
        service.approveRequestAndIssue(requestId, issuerId, { pin: '1234' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if non-LEI schema and no organization', async () => {
      mockPrisma.verifiableCredentialRequest.findUnique.mockResolvedValue({
        ...baseRequest,
        schema: { ...baseRequest.schema, name: 'Business License' },
      });
      mockPrisma.organization.findFirst.mockResolvedValue(null);

      await expect(
        service.approveRequestAndIssue(requestId, issuerId, { pin: '1234' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should allow LEI schema without organization', async () => {
      mockPrisma.verifiableCredentialRequest.findUnique.mockResolvedValue(baseRequest);
      mockPrisma.organization.findFirst.mockResolvedValue(null); // немає організації
      mockPrisma.didDocument.findFirst
        .mockResolvedValueOnce({
          // issuer DID
          did: 'did:web:issuer.test',
          keyId: 'key-1',
          encryptedPrivateKey: 'encrypted',
          encryptionSalt: 'salt',
          encryptionIv: 'iv',
          publicKey: {},
        })
        .mockResolvedValueOnce(null); // holder DID — немає

      mockPrisma.user.findUnique.mockResolvedValue({ email: 'holder@test.com' });
      mockDidService.decryptWithPin.mockResolvedValue('base64privatekey');
      mockPrisma.verifiableCredential.create.mockResolvedValue({ id: 'vc-uuid' });
      mockPrisma.verifiableCredentialRequest.update.mockResolvedValue({});
      mockNotificationService.create.mockResolvedValue({});

      const { privateKey } = require('crypto').generateKeyPairSync('ed25519');
      const privateKeyDer = privateKey.export({ type: 'pkcs8', format: 'der' });
      mockDidService.decryptWithPin.mockResolvedValue(
        Buffer.from(privateKeyDer).toString('base64'),
      );

      const result = await service.approveRequestAndIssue(requestId, issuerId, {
        pin: '1234',
        assignedLei: '12345678901234567890',
      });

      expect(result).toHaveProperty('credentialId', 'vc-uuid');

      expect(mockPrisma.verifiableCredential.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            subjectDid: 'mailto:holder@test.com',
            organizationId: null,
          }),
        }),
      );
    });
  });

  describe('revokeCredential', () => {
    const issuerId = 'issuer-uuid';
    it('should revoke active credential', async () => {
      const vc = {
        id: 'vc-uuid',
        userId: 'holder-uuid',
        issuerDid: 'did:web:issuer.test',
        type: ['VerifiableCredential', 'LEI'],
      };
      mockPrisma.verifiableCredential.findUnique.mockResolvedValue(vc);
      mockPrisma.didDocument.findUnique.mockResolvedValue({
        did: 'did:web:issuer.test',
        userId: issuerId,
      });
      mockPrisma.verifiableCredential.update.mockResolvedValue({ ...vc, status: 'REVOKED' });
      mockNotificationService.create.mockResolvedValue({});

      const result = await service.revokeCredential('vc-uuid', issuerId);
      expect(result.status).toBe('REVOKED');
    });

    it('should throw NotFoundException if credential not found', async () => {
      mockPrisma.verifiableCredential.findUnique.mockResolvedValue(null);

      await expect(service.revokeCredential('nonexistent', 'issuer-uuid')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException if not the issuer', async () => {
      mockPrisma.verifiableCredential.findUnique.mockResolvedValue({
        id: 'vc-uuid',
        issuerDid: 'did:web:other-issuer.test',
        userId: 'holder-uuid',
        type: ['VerifiableCredential', 'LEI'],
      });
      mockPrisma.didDocument.findUnique.mockResolvedValue({
        did: 'did:web:other-issuer.test',
        userId: 'other-issuer-uuid',
      });

      await expect(service.revokeCredential('vc-uuid', 'issuer-uuid')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('getPendingRequests', () => {
    it('should return pending requests for issuer', async () => {
      const requests = [{ id: 'req-1', status: 'PENDING', schema: { name: 'LEI' }, holder: {} }];
      mockPrisma.verifiableCredentialRequest.findMany.mockResolvedValue(requests);

      const result = await service.getPendingRequests('issuer-uuid');
      expect(result).toHaveLength(1);
    });
  });

  describe('getTrustedIssuers', () => {
    it('should return issuers with organization info', async () => {
      mockPrisma.user.findMany.mockResolvedValue([
        {
          id: 'i1',
          email: 'issuer@test.com',
          organizations: [{ name: 'Test Bank', lei: '11111111112222222222' }],
        },
      ]);

      const result = await service.getTrustedIssuers();
      expect(result[0].name).toBe('Test Bank');
      expect(result[0].lei).toBe('11111111112222222222');
    });

    it('should fallback to email if no organization', async () => {
      mockPrisma.user.findMany.mockResolvedValue([
        { id: 'i1', email: 'noorg@test.com', organizations: [] },
      ]);

      const result = await service.getTrustedIssuers();
      expect(result[0].name).toBe('noorg@test.com');
      expect(result[0].lei).toBe('N/A');
    });
  });
});
