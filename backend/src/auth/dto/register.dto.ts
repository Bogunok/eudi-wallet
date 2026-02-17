import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  Length,
  MinLength,
  IsString,
  Matches,
} from 'class-validator';
import { Role } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger/dist/decorators/api-property.decorator';

export class RegisterDto {
  @ApiProperty({
    description: 'Email address of the user',
    example: 'user@example.com',
  })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'StrongPass123!', minLength: 8 })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({
    description: 'PIN-code of wallet that must be 4 digits long',
    example: '1111',
  })
  @IsString()
  @Length(4, 4, { message: 'PIN must be exactly 4 digits long' })
  @Matches(/^[0-9]+$/, { message: 'PIN must contain only digits' })
  pin: string;

  @IsEnum(Role, { message: 'Role must be HOLDER, ISSUER or VERIFIER' })
  role: Role;
}
