import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsObject } from 'class-validator';

export class RequestCredentialDto {
  @ApiProperty({
    description: 'ID of the Issuer, from whom the document is requested',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsString()
  @IsNotEmpty()
  issuerId: string;

  @ApiProperty({
    description: 'ID of the document schema that we want to receive (e.g. LEI)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsString()
  @IsNotEmpty()
  schemaId: string;

  @ApiProperty({
    description: 'Data that is sent to the Issuer for verification',
    example: {
      companyName: 'Green Energy Ltd.',
      code: '123456',
    },
  })
  @IsObject()
  @IsNotEmpty()
  claimData: any;
}
