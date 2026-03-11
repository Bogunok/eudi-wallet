import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class SignDocumentDto {
  @ApiProperty({ description: 'Text or hash of the document that needs to be translated' })
  @IsString()
  @IsNotEmpty()
  documentText: string;

  @ApiProperty({ description: 'ПІН-code for unblocking private key' })
  @IsString()
  @IsNotEmpty()
  pin: string;

  @ApiProperty({ description: 'ID of document (LEI Credential), on which behalf it is signed' })
  @IsUUID()
  @IsNotEmpty()
  credentialId: string;
}
