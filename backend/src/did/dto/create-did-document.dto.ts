import { IsString, IsNotEmpty, IsOptional, IsEnum, IsObject, Equals } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateDidDocumentDto {
  @ApiProperty({
    description: 'The full DID string',
    example: 'did:key:z6MkhaXgBZDvotDkL5...',
  })
  @IsString()
  @IsNotEmpty()
  did: string;

  @ApiProperty({
    description: 'The DID method',
    example: 'web',
  })
  @IsString()
  @Equals('web', { message: 'Only "web" method is supported for organizations' })
  method: string;

  @ApiPropertyOptional({
    description: 'Optional key ID within the DID document, e.g. #key-1',
    example: '#key-1',
  })
  @IsOptional()
  @IsString()
  keyId?: string;

  @ApiProperty({
    description: 'Public key material associated with the DID',
    example: {
      kty: 'OKP',
      crv: 'Ed25519',
      x: '11qYAYKxCrfVS_7TyWQHOg7hcvPapiMlrwIaaPzAURo',
      kid: 'did:web:company.com#key-1',
    },
  })
  @IsObject()
  @IsNotEmpty()
  publicKey: Record<string, any>;

  @ApiProperty({
    description: 'Private key, encrypted with user password',
    example: 'U2FsdGVkX1+...',
  })
  @IsString()
  @IsNotEmpty()
  encryptedPrivateKey: string;

  @ApiProperty({
    description: 'Salt for deriving the encryption key from the user password',
    example: 'random_salt_value',
  })
  @IsString()
  @IsNotEmpty()
  encryptionSalt: string;

  @ApiProperty({
    description: 'Initialization Vector (IV) for symmetric encryption',
    example: 'random_iv_value',
  })
  @IsString()
  @IsNotEmpty()
  encryptionIv: string;
}
