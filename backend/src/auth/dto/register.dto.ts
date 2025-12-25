import { IsEmail, IsEnum, IsNotEmpty, MinLength } from 'class-validator';
import { Role } from '@prisma/client'; // Імпорт енаму з вашої схеми

export class RegisterDto {
  @IsEmail({}, { message: 'Invalid email' })
  email: string;

  @IsNotEmpty()
  @MinLength(8, { message: 'Password must contain at least 8 characters' })
  password: string;

  @IsEnum(Role, { message: 'Role must be HOLDER, ISSUER or VERIFIER' })
  role: Role;
}