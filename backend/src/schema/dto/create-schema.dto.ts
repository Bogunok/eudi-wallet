import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsObject } from 'class-validator';

export class CreateSchemaDto {
  @ApiProperty({
    description: 'Name of the schema',
    example: 'LegalEntityIdentifier',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'Link to schema (EBSI/IPFS)',
    example: 'https://hub.ebsi.eu/api/schemas/lei-credential',
  })
  @IsString()
  @IsNotEmpty()
  schemaId: string;

  @ApiProperty({
    description:
      'The JSON Schema structure of the credential, defining field types, UI titles, and descriptions.',
    example: {
      type: 'object',
      properties: {
        leiCode: {
          type: 'string',
          title: 'LEI Code',
          description: 'The 20-character global Legal Entity Identifier',
          minLength: 20,
          maxLength: 20,
        },
        companyName: {
          type: 'string',
          title: 'Company Name',
          description: 'The official registered name of the organization',
        },
        country: {
          type: 'string',
          title: 'Country of Registration',
          minLength: 2,
          maxLength: 2,
        },
      },
      required: ['leiCode', 'companyName', 'country'],
      additionalProperties: false,
    },
  })
  @IsObject()
  @IsNotEmpty()
  structure: Record<string, any>;
}
