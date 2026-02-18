import { IsEmail, IsString, MinLength, IsEnum, IsOptional, Length, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '@prisma/client';

export class CreateUserDto {
  @ApiProperty({
    description: 'Email address of the user',
    example: 'user@example.com',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'Password for the user account',
    example: 'strongPassword123!',
    minLength: 8,
  })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  password: string;

  @ApiPropertyOptional({
    description: 'Role of the user in the system',
    example: 'HOLDER',
    enum: Role,
    default: Role.HOLDER,
  })
  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  @ApiProperty({
    description: 'PIN code for the new user (exactly 4 digits)',
    example: '1234',
  })
  @IsString()
  @Length(4, 4)
  @Matches(/^[0-9]+$/, { message: 'PIN code must contain only numbers' })
  pin: string;
}
