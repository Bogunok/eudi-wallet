import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsObject } from 'class-validator';

export class WalletPresentationResponseDto {
  @ApiProperty({
    description: 'Verifiable Presentation Token',
    example: 'eyJhbGciOiJFUzI1NiIsInR5cCI6InZjK3NkLWp3dCJ9...~...~...',
  })
  @IsString()
  @IsNotEmpty()
  vp_token: string;

  @ApiProperty({
    description:
      'Presentation Submission. JSON-object that describes how the received vp_token corresponds to the requested credentials.',
    example: {
      id: 'a30e3b91-fb77-4d22-95fa-871689c322e2',
      definition_id: 'pd_12345',
      descriptor_map: [
        {
          id: 'lei_descriptor',
          format: 'vc+sd-jwt',
          path: '$', // Вказує, що весь vp_token є потрібним документом
        },
      ],
    },
  })
  @IsObject()
  @IsNotEmpty()
  presentation_submission: any;

  @ApiProperty({
    description: 'Session state',
    example: 'state_8f7e6d5c',
    required: false,
  })
  state?: string;
}
