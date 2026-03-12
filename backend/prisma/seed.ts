import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Start filling the database...');

  const systemIssuer = await prisma.user.upsert({
    where: { email: 'registry@eudi-wallet.eu' },
    update: {},
    create: {
      email: 'registry@eudi-wallet.eu',
      password: 'hashed_password_mock',
      role: 'ISSUER',
      pin: '1234',
    },
  });

  console.log(`System issuer has been created: ${systemIssuer.email}`);

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
      console.log(`Schema [${schema.name}] is added successfully.`);
    } else {
      console.log(`Schema [${schema.name}] already exists.`);
    }
  }

  console.log('Database filled!');
}

main()
  .catch(e => {
    console.error('Error while executing seeder:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
