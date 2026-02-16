import { IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChangePinDto {
  @ApiProperty({ example: '1111', description: 'Your current PIN' })
  @IsString()
  @Length(4, 4)
  oldPin: string;

  @ApiProperty({ example: '2222', description: 'New PIN (4 digits)' })
  @IsString()
  @Length(4, 4)
  newPin: string;
}
