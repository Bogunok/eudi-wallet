import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';

describe('EUDI Wallet E2E Tests', () => {
  let app: INestApplication;

  let holderCookies: string[];
  let issuerCookies: string[];
  let verifierCookies: string[];
  let adminCookies: string[];

  const extractCookies = (res: request.Response): string[] =>
    (res.headers['set-cookie'] as unknown as string[]) ?? [];

  const cookieHeader = (cookies: string[]) => cookies.join('; ');

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    app.use(cookieParser());
    await app.init();

    const adminRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: process.env.ADMIN_EMAIL ?? 'admin@eudi-wallet.eu',
        password: process.env.ADMIN_PASSWORD ?? 'Admin1234!',
      });
    adminCookies = extractCookies(adminRes);

    const issuerLoginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'registry@eudi-wallet.eu', password: 'Issuer1234!' });
    issuerCookies = extractCookies(issuerLoginRes);

    // Реєструємо verifier через адміна
    const verifierEmail = `verifier-e2e-${Date.now()}@test.com`;
    await request(app.getHttpServer())
      .post('/auth/register-verifier')
      .set('Cookie', cookieHeader(adminCookies))
      .send({
        email: verifierEmail,
        password: 'Password123!',
        pin: '1234',
        organizationName: 'E2E Test Bank',
        country: 'UA',
        lei: `333${Date.now()}`.slice(0, 20).padEnd(20, '0'),
      });

    const verifierLoginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: verifierEmail, password: 'Password123!' });
    verifierCookies = extractCookies(verifierLoginRes);
  }, 30000);

  afterAll(async () => {
    await app.close();
  });

  // ─── AUTH ────────────────────────────────────────────────────────────────

  describe('Auth', () => {
    it('POST /auth/register — should register a holder and set cookies', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: `holder-e2e-${Date.now()}@test.com`,
          password: 'Password123!',
          pin: '1234',
        });

      expect(res.status).toBe(201);
      expect(res.body.message).toBe('Registered and logged in successfully');

      const cookies = extractCookies(res);
      expect(cookies.some(c => c.startsWith('accessToken='))).toBe(true);
      expect(cookies.some(c => c.startsWith('refreshToken='))).toBe(true);
      holderCookies = cookies;
    });

    it('POST /auth/login — should login and set cookies', async () => {
      const email = `holder-login-${Date.now()}@test.com`;
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email, password: 'Password123!', pin: '1234' });

      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email, password: 'Password123!' });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Logged in successfully');
      const cookies = extractCookies(res);
      expect(cookies.some(c => c.startsWith('accessToken='))).toBe(true);
    });

    it('POST /auth/login — should reject wrong password', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'nonexistent@test.com', password: 'wrong' });

      expect(res.status).toBe(401);
    });

    it('POST /auth/logout — should clear cookies', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Cookie', cookieHeader(holderCookies));

      expect(res.status).toBe(200);
    });

    it('POST /auth/refresh — should reject without refresh token', async () => {
      const res = await request(app.getHttpServer()).post('/auth/refresh');
      expect(res.status).toBe(401);
    });
  });

  // ─── SCHEMAS ─────────────────────────────────────────────────────────────

  describe('Schemas', () => {
    let schemaId: string;
    const schemaName = `TestSchema-${Date.now()}`;

    it('POST /schemas — should create schema as issuer', async () => {
      const res = await request(app.getHttpServer())
        .post('/schemas')
        .set('Cookie', cookieHeader(issuerCookies))
        .send({
          name: schemaName,
          schemaId: `custom:test:${Date.now()}`,
          structure: {
            type: 'object',
            properties: { field1: { type: 'string' } },
            required: ['field1'],
            additionalProperties: false,
          },
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('schema');
      schemaId = res.body.schema.id;
    });

    it('GET /schemas — should return issuer schemas', async () => {
      const res = await request(app.getHttpServer())
        .get('/schemas')
        .set('Cookie', cookieHeader(issuerCookies));

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('GET /schemas/available — should return all schemas for holder', async () => {
      const res = await request(app.getHttpServer())
        .get('/schemas/available')
        .set('Cookie', cookieHeader(holderCookies));

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('DELETE /schemas/:id — should delete schema', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/schemas/${schemaId}`)
        .set('Cookie', cookieHeader(issuerCookies));

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Schema deleted successfully');
    });

    it('POST /schemas — should reject holder creating schema', async () => {
      const res = await request(app.getHttpServer())
        .post('/schemas')
        .set('Cookie', cookieHeader(holderCookies))
        .send({
          name: 'Unauthorized',
          schemaId: 'custom:unauthorized',
          structure: { type: 'object', properties: {}, additionalProperties: false },
        });

      expect(res.status).toBe(403);
    });
  });

  // ─── ORGANIZATION ─────────────────────────────────────────────────────────

  describe('Organization', () => {
    const holderLei = `999${Date.now()}`.slice(0, 20).padEnd(20, '0');
    it('POST /organization/create — should create organization for holder', async () => {
      const res = await request(app.getHttpServer())
        .post('/organization/create')
        .set('Cookie', cookieHeader(holderCookies))
        .send({
          lei: holderLei,
          name: 'E2E Test Company',
          country: 'UA',
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('lei', holderLei);
      expect(res.body).toHaveProperty('name', 'E2E Test Company');
    });

    it('GET /organization/my — should return organization', async () => {
      const res = await request(app.getHttpServer())
        .get('/organization/my')
        .set('Cookie', cookieHeader(holderCookies));

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('name', 'E2E Test Company');
    });

    it('POST /organization/create — should reject duplicate organization', async () => {
      const res = await request(app.getHttpServer())
        .post('/organization/create')
        .set('Cookie', cookieHeader(holderCookies))
        .send({
          lei: `888${Date.now()}`.slice(0, 20).padEnd(20, '0'),
          name: 'Duplicate',
          country: 'UA',
        });

      expect(res.status).toBe(400);
    });

    it('GET /organization/my — should reject unauthenticated request', async () => {
      const res = await request(app.getHttpServer()).get('/organization/my');
      expect(res.status).toBe(401);
    });
  });

  // ─── VERIFIER ─────────────────────────────────────────────────────────────

  describe('Verifier', () => {
    let sessionId: string;

    it('POST /verifier/requests — should create verification session', async () => {
      const res = await request(app.getHttpServer())
        .post('/verifier/requests')
        .set('Cookie', cookieHeader(verifierCookies))
        .send({
          requestedType: 'LEI',
          requestedFields: ['lei', 'legalName'],
          purpose: 'E2E test verification',
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('sessionId');
      expect(res.body).toHaveProperty('walletRequestUrl');
      expect(res.body.walletRequestUrl).toContain('openid4vp://');
      sessionId = res.body.sessionId;
    });

    it('GET /verifier/sessions — should return sessions list', async () => {
      const res = await request(app.getHttpServer())
        .get('/verifier/sessions')
        .set('Cookie', cookieHeader(verifierCookies));

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('GET /verifier/sessions/:id — should return session details', async () => {
      const res = await request(app.getHttpServer())
        .get(`/verifier/sessions/${sessionId}`)
        .set('Cookie', cookieHeader(verifierCookies));

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('status', 'PENDING');
      expect(res.body).toHaveProperty('requestedFields');
    });

    it('GET /verifier/sessions/:id/public — should return public session without auth', async () => {
      const res = await request(app.getHttpServer()).get(`/verifier/sessions/${sessionId}/public`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('requestedType', 'LEI');
      expect(res.body).toHaveProperty('verifier');
      expect(res.body).not.toHaveProperty('nonce');
    });

    it('GET /verifier/trusted-list — should return verifiers list for holder', async () => {
      const res = await request(app.getHttpServer())
        .get('/verifier/trusted-list')
        .set('Cookie', cookieHeader(holderCookies));

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('POST /verifier/requests — should reject holder creating verification request', async () => {
      const res = await request(app.getHttpServer())
        .post('/verifier/requests')
        .set('Cookie', cookieHeader(holderCookies))
        .send({
          requestedType: 'LEI',
          requestedFields: ['lei'],
        });

      expect(res.status).toBe(403);
    });

    it('GET /verifier/sessions/:id — should reject access from another verifier', async () => {
      const res = await request(app.getHttpServer())
        .get(`/verifier/sessions/${sessionId}`)
        .set('Cookie', cookieHeader(holderCookies));

      expect(res.status).toBe(403);
    });
  });

  // ─── VC ───────────────────────────────────────────────────────────────────

  describe('VC', () => {
    it('GET /vc/my — should return credentials for holder', async () => {
      const res = await request(app.getHttpServer())
        .get('/vc/my')
        .set('Cookie', cookieHeader(holderCookies));

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('GET /vc/my — should reject unauthenticated request', async () => {
      const res = await request(app.getHttpServer()).get('/vc/my');
      expect(res.status).toBe(401);
    });
  });

  // ─── NOTIFICATION ─────────────────────────────────────────────────────────

  describe('Notifications', () => {
    it('GET /notifications — should return notifications for holder', async () => {
      const res = await request(app.getHttpServer())
        .get('/notifications')
        .set('Cookie', cookieHeader(holderCookies));

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('GET /notifications — should reject unauthenticated request', async () => {
      const res = await request(app.getHttpServer()).get('/notifications');
      expect(res.status).toBe(401);
    });
  });
});
