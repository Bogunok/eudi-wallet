import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsArray, IsNotEmpty, IsUUID } from 'class-validator';

export class PresentCredentialDto {
  @ApiProperty({
    description: 'The ID of the Verifiable Credential stored in the wallet to be presented.',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  @IsNotEmpty()
  credentialId: string;

  @ApiProperty({
    description:
      'The verification session ID provided by the Verifier (acts as the target for the presentation).',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsString()
  @IsNotEmpty()
  sessionId: string;

  @ApiProperty({
    description:
      'An array of claim names that the user explicitly consented to disclose (Selective Disclosure).',
    example: ['lei_code', 'legal_name'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  discloseClaims: string[];
}
