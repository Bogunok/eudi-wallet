import { IsEnum, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { VerifiableCredentialStatus } from '@prisma/client';

export class UpdateCredentialDto {
  @ApiProperty({
    description: 'New status of the credential',
    enum: VerifiableCredentialStatus,
    example: VerifiableCredentialStatus.REVOKED,
  })
  @IsEnum(VerifiableCredentialStatus)
  @IsNotEmpty()
  status: VerifiableCredentialStatus;
}
