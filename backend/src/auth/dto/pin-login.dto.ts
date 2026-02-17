import { IsEmail, IsString, Length, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

//for fast login with pin code only, without password
export class PinLoginDto {
  @ApiProperty({
    description: 'Email address of the user',
    example: 'user@example.com',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'PIN-code of wallet that must be 4 digits long',
    example: '1234',
  })
  @IsString()
  @Length(4, 4)
  @Matches(/^[0-9]+$/, { message: 'ПІН-код повинен містити лише цифри' })
  pin: string;
}
