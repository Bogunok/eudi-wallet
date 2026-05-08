import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsArray, IsOptional, ArrayMinSize } from 'class-validator';

export class VerificationRequestDto {
  @ApiProperty({
    description: 'Type of Verifiable Credential requested from the wallet',
    example: 'LEICredential',
  })
  @IsString()
  @IsNotEmpty()
  requestedType: string;

  @ApiProperty({
    description:
      'Specific claim names to request via Selective Disclosure. ' +
      'The wallet will present only these fields from the credential.',
    example: ['lei', 'legalName', 'entityStatus'],
    type: [String],
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  requestedFields: string[];

  @ApiProperty({
    description: 'Human-readable purpose shown to the holder in the wallet consent screen',
    example: 'Verification of legal entity status for opening a corporate bank account',
    required: false,
  })
  @IsOptional()
  @IsString()
  purpose?: string;
}
