// issuer/dto/approve-request.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class ApproveRequestDto {
  @ApiProperty({
    description: 'PIN-code of the issuer for decrypting the private key and signing the credential',
    example: '9999',
  })
  @IsString()
  @IsNotEmpty()
  pin: string;
}
