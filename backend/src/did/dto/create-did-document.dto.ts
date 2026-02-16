import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum DidMethod {
  KEY = 'key',
  EBSI = 'ebsi',
  WEB = 'web',
}

export class CreateDidDocumentDto {
  @ApiProperty({
    description: 'The full DID string',
    example: 'did:key:z6MkhaXgBZDvotDkL5...',
  })
  @IsString()
  @IsNotEmpty()
  did: string;

  @ApiProperty({
    description: 'The DID method, e.g. key, ebsi, web',
    enum: DidMethod,
    example: DidMethod.KEY,
  })
  @IsEnum(DidMethod)
  method: DidMethod;

  @ApiPropertyOptional({
    description: 'Optional key ID within the DID document, e.g. #key-1',
    example: '#key-1',
  })
  @IsOptional()
  @IsString()
  keyId?: string;

  @ApiProperty({
    description: 'Public key in Multibase/Hex format',
    example: 'z6MkhaXgBZDvotDkL5...',
  })
  @IsString()
  @IsNotEmpty()
  publicKey: string;

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
