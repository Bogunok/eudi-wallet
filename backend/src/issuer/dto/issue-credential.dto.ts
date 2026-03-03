import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsArray, IsObject, IsNotEmpty, IsOptional } from 'class-validator';

export class IssueCredentialDto {
  @ApiProperty({
    description: 'Types of the credential',
    example: ['VerifiableCredential', 'LegalEntity'],
  })
  @IsArray()
  @IsString({ each: true })
  type: string[];

  @ApiProperty({
    description: 'DID of the organization receiving the VC',
    example: '123456789abcdefghi',
  })
  @IsString()
  @IsNotEmpty()
  subjectDid: string;

  @ApiProperty({
    description: 'The actual data of the certificate (LEI code, name, etc.)',
    example: {
      leiCode: '5493001KJTIU7EMLZK',
      name: 'Example Company Ltd.',
    },
  })
  @IsObject()
  @IsNotEmpty()
  payload: any;

  @ApiProperty({
    description: 'ID of the Holder (User) receiving this VC',
    example: '12345678-90ab-cdef-1234-567890abcdef',
  })
  @IsString()
  @IsNotEmpty()
  userId: string;
}
