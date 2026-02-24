import { IsString, IsNotEmpty, IsUUID, IsObject, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateVerifiableCredentialDto {
  @ApiPropertyOptional({
    description: 'Optional organization link',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsOptional()
  @IsUUID()
  organizationId?: string;

  @ApiProperty({
    description: 'The PIN for decrypting the private key of the issuer DID document',
    example: '1234',
  })
  @IsString()
  @IsNotEmpty()
  pin: string;

  @ApiProperty({
    description:
      'The DID of the credential subject, e.g. the company or person the credential is about',
    example: 'did:key:z6MkfVJ...',
  })
  @IsString()
  @IsNotEmpty()
  subjectDid: string;

  @ApiProperty({ description: 'ID of schema from VerifiableCredentialSchema' })
  @IsString()
  @IsNotEmpty()
  schemaId: string;

  @ApiProperty({
    description:
      'The actual data of the credential, which will be included in the credentialSubject.',
    example: {
      degree: 'Bachelor',
      university: 'KNU',
      year: 2026,
    },
  })
  @IsObject()
  @IsNotEmpty()
  credentialData: any;
}
