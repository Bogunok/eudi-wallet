import { ApiProperty } from '@nestjs/swagger/dist/decorators/api-property.decorator';
import { IsString, IsNotEmpty, Length } from 'class-validator';

export class CreateOrganizationDto {
  @ApiProperty({
    description: 'Unique 20-character LEI code of the organization',
    example: '12345678901234567890',
  })
  @IsString()
  @IsNotEmpty()
  @Length(20, 20, { message: 'LEI must be exactly 20 characters' })
  lei: string;

  @ApiProperty({
    description: 'Name of the organization',
    example: 'Lavazza',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'Country where the organization is registered',
    example: 'Italy',
  })
  @IsString()
  @IsNotEmpty()
  country: string;
}
