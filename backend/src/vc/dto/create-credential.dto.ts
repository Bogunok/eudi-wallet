import {
  IsString,
  IsNotEmpty,
  IsUUID,
  IsObject,
  IsArray,
  IsOptional,
  IsEnum,
  IsDateString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { VerifiableCredentialStatus } from '@prisma/client';

export class CreateVerifiableCredentialDto {
  @ApiProperty({
    example: ['VerifiableCredential', 'LegalEntity'],
  })
  @IsArray()
  @IsString({ each: true })
  type: string[];

  @ApiProperty({
    example: 'did:key:z6MkhaX...',
  })
  @IsString()
  @IsNotEmpty()
  issuerDid: string;

  @ApiProperty({
    description:
      'The DID of the credential subject, e.g. the company or person the credential is about',
    example: 'did:key:z6MkfVJ...',
  })
  @IsString()
  @IsNotEmpty()
  subjectDid: string;

  @ApiProperty({
    description:
      'The actual claims/data of the credential, e.g. company name, tax ID, etc.',
    example: {
      name: 'Company Name',
      taxId: '12345678',
    },
  })
  @IsObject()
  payload: any;

  @ApiProperty({
    description: 'The signed JWT/SD-JWT string',
  })
  @IsString()
  @IsNotEmpty()
  rawJwt: string;

  @ApiPropertyOptional({
    enum: VerifiableCredentialStatus,
    example: VerifiableCredentialStatus.ACTIVE,
  })
  @IsOptional()
  @IsEnum(VerifiableCredentialStatus)
  status?: VerifiableCredentialStatus;

  @ApiProperty({
    description: 'Issuance date of the credential',
    example: '2026-02-11T10:00:00Z',
  })
  @IsDateString()
  issuedAt: string;

  @ApiPropertyOptional({
    description: 'Expiration date of the credential',
    example: '2027-02-11T10:00:00Z',
  })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @ApiProperty({
    description: 'ID of the user who owns the wallet',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  @IsNotEmpty()
  userId: string;

  @ApiPropertyOptional({
    description: 'Optional organization link',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsOptional()
  @IsUUID()
  organizationId?: string;
}
