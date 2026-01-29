import { IsEmail, IsNotEmpty, IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger/dist/decorators/api-property.decorator';

export class LoginDto {
  @IsEmail()
  email: string;

  @ApiProperty({ example: '1111', description: 'PIN-код із 4 цифр' })
  @IsString()
  @Length(4, 4, { message: 'PIN має складатися рівно з 4 цифр' }) 
  pin: string;
}