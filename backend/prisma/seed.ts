import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const ADMIN_EMAIL = 'admin@eudi-wallet.eu';
const ADMIN_PASSWORD = 'Admin1234!';
const ADMIN_PIN = '0000';

const ISSUER_EMAIL = 'registry@eudi-wallet.eu';
const ISSUER_PASSWORD = 'Issuer1234!';
const ISSUER_PIN = '1111';

async function main() {
  console.log('Start filling the database...');

  // --- Admin ---
  const adminPasswordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
  const adminPinHash = await bcrypt.hash(ADMIN_PIN, 10);

  const admin = await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: {},
    create: {
      email: ADMIN_EMAIL,
      password: adminPasswordHash,
      pin: adminPinHash,
      role: 'ADMIN',
    },
  });
  console.log(`Admin created: ${admin.email} / password: ${ADMIN_PASSWORD} / PIN: ${ADMIN_PIN}`);

  // --- System Issuer ---
  const issuerPasswordHash = await bcrypt.hash(ISSUER_PASSWORD, 10);
  const issuerPinHash = await bcrypt.hash(ISSUER_PIN, 10);

  const systemIssuer = await prisma.user.upsert({
    where: { email: ISSUER_EMAIL },
    update: {
      password: issuerPasswordHash,
      pin: issuerPinHash,
    },
    create: {
      email: ISSUER_EMAIL,
      password: issuerPasswordHash,
      pin: issuerPinHash,
      role: 'ISSUER',
    },
  });
  console.log(
    `Issuer created: ${systemIssuer.email} / password: ${ISSUER_PASSWORD} / PIN: ${ISSUER_PIN}`,
  );

  const existingOrg = await prisma.organization.findFirst({
    where: { userId: systemIssuer.id },
  });

  if (!existingOrg) {
    await prisma.organization.create({
      data: {
        lei: '00000000000000000000',
        name: 'EUDI System Registry',
        country: 'EU',
        userId: systemIssuer.id,
      },
    });
    console.log('Organization for Issuer created: EUDI System Registry');
  } else {
    console.log('Organization for Issuer already exists');
  }

  // --- Schemas ---
  const schemasToSeed = [
    {
      name: 'Legal Entity Identifier',
      schemaId: 'ebsi:schema:lei:v1',
      structure: {
        type: 'object',
        properties: {
          leiCode: { type: 'string', minLength: 20, maxLength: 20 },
          companyName: { type: 'string' },
          country: { type: 'string', minLength: 2, maxLength: 4 },
          registrationNumber: { type: 'string' },
        },
        required: ['leiCode', 'companyName', 'country'],
        additionalProperties: false,
      },
    },
    {
      name: 'Power of Attorney',
      schemaId: 'custom:schema:poa:v1',
      structure: {
        type: 'object',
        properties: {
          grantorName: { type: 'string', description: 'who grants' },
          granteeName: { type: 'string', description: 'to whom it is granted' },
          validUntil: { type: 'string', format: 'date' },
          permissions: { type: 'array', items: { type: 'string' } },
        },
        required: ['grantorName', 'granteeName', 'validUntil'],
        additionalProperties: false,
      },
    },
  ];

  for (const schema of schemasToSeed) {
    const existingSchema = await prisma.verifiableCredentialSchema.findFirst({
      where: { schemaId: schema.schemaId },
    });

    if (!existingSchema) {
      await prisma.verifiableCredentialSchema.create({
        data: {
          name: schema.name,
          schemaId: schema.schemaId,
          structure: schema.structure,
          issuerId: systemIssuer.id,
        },
      });
      console.log(`Schema [${schema.name}] added.`);
    } else {
      console.log(`Schema [${schema.name}] already exists.`);
    }
  }

  console.log('\n=== Seed completed! ===');
  console.log(`Admin:  ${ADMIN_EMAIL} / ${ADMIN_PASSWORD} / PIN: ${ADMIN_PIN}`);
  console.log(`Issuer: ${ISSUER_EMAIL} / ${ISSUER_PASSWORD} / PIN: ${ISSUER_PIN}`);
}

main()
  .catch(e => {
    console.error('Error while executing seeder:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
