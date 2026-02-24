import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsObject } from 'class-validator';

export class CreateSchemaDto {
  @ApiProperty({
    description: 'Name of the schema (e.g., BachelorDegree, LegalEntityIdentifier)',
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
    description: 'JSON structure of fields that will be in this document',
    example: {
      leiCode: 'string',
      companyName: 'string',
      country: 'string',
    },
  })
  @IsObject()
  @IsNotEmpty()
  structure: any;
}
