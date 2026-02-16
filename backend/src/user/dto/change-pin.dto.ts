import { IsString, IsOptional, Length, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ChangePinDto {
  @ApiPropertyOptional({
    description: 'Current PIN (required if PIN was already set)',
    example: '1234',
  })
  @IsOptional()
  @IsString()
  @Length(4, 4, { message: 'Current PIN must be between 4 characters long' })
  oldPin?: string;

  @ApiProperty({
    description: 'New PIN (only digits)',
    example: '5678',
  })
  @IsString()
  @Length(4, 4, { message: 'New PIN must be 4 characters long' })
  @Matches(/^[0-9]+$/, { message: 'PIN must contain only digits' })
  newPin: string;
}
