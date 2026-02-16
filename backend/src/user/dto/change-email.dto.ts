import { IsEmail, IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChangeEmailDto {
  @ApiProperty({
    description: 'New email address',
    example: 'new-email@example.com',
  })
  @IsEmail({}, { message: 'Invalid email format' })
  @IsNotEmpty()
  newEmail: string;

  @ApiProperty({
    description: 'Current password for confirmation',
    example: 'mySecretPassword123',
  })
  @IsString()
  @IsNotEmpty()
  password: string;
}
