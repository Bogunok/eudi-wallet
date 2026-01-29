import { IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChangePinDto {
  @ApiProperty({ example: '1111', description: 'Ваш поточний PIN' })
  @IsString()
  @Length(4, 4)
  oldPin: string;

  @ApiProperty({ example: '2222', description: 'Новий PIN (4 цифри)' })
  @IsString()
  @Length(4, 4)
  newPin: string;
}