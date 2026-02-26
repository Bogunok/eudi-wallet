import {
  Controller,
  Post,
  Get,
  UseGuards,
  Body,
  HttpCode,
  HttpStatus,
  Patch,
  Req,
} from '@nestjs/common';
import { WalletService } from './wallet.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiOperation } from '@nestjs/swagger/dist/decorators/api-operation.decorator';
import { ChangePinDto } from './dto/change-pin.dto';
import {
  ApiBearerAuth,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiInternalServerErrorResponse,
} from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from 'src/auth/guards/roles.guard';

@ApiTags('Wallet')
@Controller('wallet')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class WalletController {
  authService: any;
  constructor(private readonly walletService: WalletService) {}

  @Roles('HOLDER')
  @ApiOperation({ summary: 'Create a new DID for the user (requires PIN)' })
  @ApiResponse({ status: 201, description: 'DID created successfully.' })
  @ApiUnauthorizedResponse({ description: 'The user is unauthorized.' })
  @ApiForbiddenResponse({ description: 'The user is forbidden to perform this action.' })
  @ApiNotFoundResponse({ description: 'DID not found.' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error has occured.' })
  @Post('create-did')
  async createDid(@Req() req, @Body('pin') pin: string) {
    return this.walletService.createDid(req.user.id, pin);
  }

  @Roles('HOLDER')
  @ApiOperation({ summary: 'Get all user DIDs' })
  @ApiResponse({ status: 200, description: 'DID retrieved successfully.' })
  @ApiUnauthorizedResponse({ description: 'The user is unauthorized.' })
  @ApiForbiddenResponse({ description: 'The user is forbidden to perform this action.' })
  @ApiNotFoundResponse({ description: 'DID not found.' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error has occured.' })
  @Get('dids')
  getMyDids(@Req() req) {
    return this.walletService.getMyDids(req.user.id);
  }

  @Roles('HOLDER')
  @ApiOperation({ summary: 'Change wallet PIN code' })
  @ApiResponse({ status: 200, description: 'PIN changed successfully.' })
  @ApiUnauthorizedResponse({ description: 'The user is unauthorized.' })
  @ApiForbiddenResponse({ description: 'The user is forbidden to perform this action.' })
  @ApiNotFoundResponse({ description: 'PIN not found.' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error has occured.' })
  @Patch('change-pin')
  async updatePin(@Req() req, @Body() dto: ChangePinDto) {
    return this.walletService.changePin(req.user.id, dto.oldPin, dto.newPin);
  }

  @Roles('HOLDER')
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
}
