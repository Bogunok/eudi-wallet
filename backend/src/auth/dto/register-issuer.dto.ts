import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class RegisterIssuerDto {
  @ApiProperty({ description: 'Issuer email', example: 'admin@uni.edu.ua' })
  @IsEmail()
  email: string;

  @ApiProperty({ description: 'Issuer password', example: 'StrongPass123!' })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({
    description: 'Name of Issuer`s official organization',
    example: 'National University',
  })
  @IsString()
  @IsNotEmpty()
  organizationName: string;

  @ApiProperty({ description: 'Issuer`s country', example: 'UA' })
  @IsString()
  @IsNotEmpty()
  country: string;

  @ApiProperty({ description: 'Issuer`s lei', example: '12345678901234567890' })
  @IsString()
  @IsNotEmpty()
  lei: string;
}
