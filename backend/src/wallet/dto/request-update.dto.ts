import { IsString, IsNotEmpty, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RequestUpdateDto {
  @ApiProperty({ description: 'ID of the VC to update' })
  @IsString()
  @IsNotEmpty()
  vcId: string;

  @ApiProperty({ description: 'New claim data' })
  @IsObject()
  claimData: Record<string, unknown>;

  @ApiProperty({ description: 'Holder PIN for signing' })
  @IsString()
  @IsNotEmpty()
  pin: string;
}
