import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class GenerateDidDto {
  @ApiProperty({
    description: 'PIN-code for encrypting the private key',
    example: '1234',
  })
  @IsString()
  @IsNotEmpty()
  pin: string;

  @ApiProperty({
    description: 'Domain of the organization for generating did:web',
    example: 'company.com',
  })
  @IsString()
  @IsNotEmpty()
  domain: string;
}
