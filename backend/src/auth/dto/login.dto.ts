import { IsEmail, IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger/dist/decorators/api-property.decorator';

export class LoginDto {
  @IsEmail()
  email: string;

  @ApiProperty({
    example: '1111',
    description: 'PIN-code of 4 digits',
  })
  @IsString()
  @Length(4, 4, { message: 'PIN must be exactly 4 digits long' })
  pin: string;
}
