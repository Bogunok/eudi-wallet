import { Controller, Post, Get, Body, HttpCode, HttpStatus, Req } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { ChangePinDto } from './dto/change-pin.dto';
import {
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiBody,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiInternalServerErrorResponse,
  ApiBadRequestResponse,
} from '@nestjs/swagger';
import { PresentCredentialDto } from './dto/present-credential.dto';
import { SignDocumentDto } from './dto/sign-document.dto';
import { Role } from '@prisma/client';
import { Auth } from '../auth/decorators/auth.decorator';

@ApiTags('Wallet')
@Controller('wallet')
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  /*@Auth(Role.HOLDER, Role.VERIFIER, Role.ISSUER)
  @ApiOperation({ summary: 'Create a new DID for the user (requires PIN)' })
  @ApiResponse({ status: 201, description: 'DID created successfully.' })
  @ApiUnauthorizedResponse({ description: 'The user is unauthorized.' })
  @ApiForbiddenResponse({ description: 'The user is forbidden to perform this action.' })
  @ApiNotFoundResponse({ description: 'DID not found.' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error has occured.' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: { pin: { type: 'string', example: '1111' } },
    },
  })
  @Post('create-did')
  async createDid(@Req() req, @Body('pin') pin: string) {
    return this.walletService.createDid(req.user.id, pin);
  }*/

  /*comment for a while because there is the same in User.controller
  @Auth(Role.HOLDER)
  @ApiOperation({ summary: 'Change wallet PIN code' })
  @ApiResponse({ status: 200, description: 'PIN changed successfully.' })
  @ApiUnauthorizedResponse({ description: 'The user is unauthorized.' })
  @ApiForbiddenResponse({ description: 'The user is forbidden to perform this action.' })
  @ApiNotFoundResponse({ description: 'PIN not found.' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error has occured.' })
  @Patch('change-pin')
  async updatePin(@Req() req, @Body() dto: ChangePinDto) {
    return this.walletService.changePin(req.user.id, dto.oldPin, dto.newPin);
  }*/

  @Auth(Role.HOLDER)
  @ApiOperation({ summary: 'Reset wallet (delete DID and VC)' })
  @ApiResponse({ status: 200, description: 'Wallet reset successfully.' })
  @ApiUnauthorizedResponse({ description: 'The user is unauthorized.' })
  @ApiForbiddenResponse({ description: 'The user is forbidden to perform this action.' })
  @ApiNotFoundResponse({ description: 'Wallet not found.' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error has occured.' })
  @HttpCode(HttpStatus.OK)
  @Post('reset-wallet')
  async reset(@Req() req) {
    return this.walletService.resetWallet(req.user.id);
  }

  @Auth(Role.HOLDER)
  @ApiOperation({ summary: 'Present a Verifiable Credential to a Verifier (Selective Disclosure)' })
  @ApiResponse({ status: 200, description: 'Credential successfully presented to the verifier.' })
  @ApiUnauthorizedResponse({ description: 'The user is unauthorized.' })
  @ApiForbiddenResponse({ description: 'The user is forbidden to perform this action.' })
  @ApiNotFoundResponse({ description: 'Credential or Session not found.' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error has occured.' })
  @Post('present-credential')
  async presentCredential(@Req() req, @Body() dto: PresentCredentialDto) {
    const userId = req.user.id;

    return this.walletService.presentCredentialToVerifier(
      userId,
      dto.credentialId,
      dto.sessionId,
      dto.discloseClaims,
    );
  }

  @Auth(Role.HOLDER)
  @ApiOperation({ summary: 'Create a Qualified Electronic Seal for a document' })
  @ApiResponse({ status: 200, description: 'Document successfully signed.' })
  @ApiUnauthorizedResponse({ description: 'The user is unauthorized.' })
  @ApiForbiddenResponse({ description: 'The user is forbidden to perform this action.' })
  @ApiBadRequestResponse({ description: 'Incorrect data or CredentialId not found/not yours.' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error has occured.' })
  @Post('sign-document')
  async signDocument(@Req() req: any, @Body() dto: SignDocumentDto) {
    return this.walletService.signDocument(req.user.id, dto);
  }
}
