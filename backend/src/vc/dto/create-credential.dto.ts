import { IsString, IsNotEmpty, IsUUID, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCredentialDto {
  @ApiProperty({ example: 'uuid-org-123' })
  @IsUUID()
  organizationId: string;

  @ApiProperty({ example: '1111', description: 'PIN-код для підтвердження' })
  @IsString()
  @IsNotEmpty()
  pin: string;

  @ApiProperty({ example: 'user@email.com' })
  @IsString()
  email: string;

  // Дані для самого документа (LEI, назва)
  @ApiProperty()
  @IsObject()
  orgData: {
    lei: string;
    name: string;
    country: string;
  };
}