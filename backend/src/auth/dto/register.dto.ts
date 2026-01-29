import { IsEmail, IsEnum, IsNotEmpty, Length, MinLength, IsString } from 'class-validator';
import { Role } from '@prisma/client'; 
import { ApiProperty } from '@nestjs/swagger/dist/decorators/api-property.decorator';

export class RegisterDto {
  @IsEmail({}, { message: 'Invalid email' })
  email: string;

  @IsNotEmpty()
  @MinLength(8, { message: 'Password must contain at least 8 characters' })
  password: string;

  @ApiProperty({ example: '1111', description: 'PIN-код гаманця' })
  @IsString()
  @Length(4, 6)
  pin: string;

  @IsEnum(Role, { message: 'Role must be HOLDER, ISSUER or VERIFIER' })
  role: Role;
}