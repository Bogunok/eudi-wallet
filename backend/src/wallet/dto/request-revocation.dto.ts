import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RequestRevocationDto {
  @ApiProperty({ description: 'ID of the VC to revoke' })
  @IsString()
  @IsNotEmpty()
  vcId: string;
}
