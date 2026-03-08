import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class VerificationRequestDto {
  @ApiProperty({
    description: 'Type of Verifiable Credential requested from the wallet',
    example: 'LEICredential',
  })
  @IsString()
  @IsNotEmpty()
  requestedType: string;

  // За потреби додати інші параметри, наприклад purpose
  // (мета запиту, щоб показати її користувачу в гаманці)
  @ApiProperty({
    description: 'Purpose of the verification request (for display in the wallet)',
    example: 'Verification of legal entity status for opening a corporate account',
    required: false,
  })
  purpose?: string;
}
