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
      'The structure of the credential, defining field types, UI labels, and descriptions.',
    example: {
      leiCode: {
        type: 'string',
        label: 'LEI Code',
        description: 'The 20-character global Legal Entity Identifier',
      },
      companyName: {
        type: 'string',
        label: 'Company Name',
        description: 'The official registered name of the organization',
      },
      country: {
        type: 'string',
        label: 'Country of Registration',
      },
    },
  })
  @IsObject()
  @IsNotEmpty()
  structure: Record<string, any>;
}
