import {
  IsEmail,
  IsString,
  MinLength,
  Length,
  Matches,
  IsEnum,
  IsOptional,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Role } from '@prisma/client';

export class CreateUserByAdminDto {
  @ApiProperty({
    description: 'Email address of the user',
    example: 'newuser@example.com',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'Password for the new user (min length 8 characters)',
    example: 'StrongPass123!',
    minLength: 8,
  })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({
    description: 'PIN code for the new user (exactly 4 digits)',
    example: '1234',
  })
  @IsString()
  @Length(4, 4)
  @Matches(/^[0-9]+$/, { message: 'PIN code must contain only numbers' })
  pin: string;

  @ApiPropertyOptional({
    description: 'Role of the new user',
    enum: Role,
    default: Role.HOLDER,
  })
  @IsOptional()
  @IsEnum(Role)
  role?: Role;
}

export class UpdateUserByAdminDto extends PartialType(CreateUserByAdminDto) {}
