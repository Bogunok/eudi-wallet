import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';

export class SetPinDto {
  @ApiProperty({
    description: 'PIN-code for fast wallet access',
    example: '1234',
  })
  @IsString()
  @Length(4, 4, { message: 'PIN has to be 4 digits long' })
  pin: string;
}
