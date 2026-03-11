import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiInternalServerErrorResponse,
  ApiForbiddenResponse,
  ApiUnauthorizedResponse,
  ApiResponse,
  ApiParam,
  ApiNotFoundResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { VerifierService } from './verifier.service';
import { VerificationRequestDto } from './dto/verification-request.dto';
import { WalletPresentationResponseDto } from './dto/wallet-presentation-response.dto';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('Verifier')
@Controller('verifier')
export class VerifierController {
  constructor(private readonly verifierService: VerifierService) {}

  @Roles('VERIFIER')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Create a new verification request (e.g., ask for LEI Credential)' })
  @ApiResponse({
    description: 'Returns a session ID and the OID4VP redirect URL for the wallet.',
    status: HttpStatus.CREATED,
  })
  @ApiUnauthorizedResponse({ description: 'The user is unauthorized.' })
  @ApiForbiddenResponse({ description: 'The user is forbidden to perform this action.' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error has occured.' })
  @Post('requests')
  async createVerificationRequest(@Body() dto: VerificationRequestDto, @Req() req: any) {
    return this.verifierService.createVerificationRequest(req.user.id, dto.requestedType);
  }

  @Roles('VERIFIER')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Get the status and result of a specific verification session' })
  @ApiParam({ name: 'sessionId', description: 'ID of the Verification Session' })
  @ApiResponse({
    description: 'Returns the session status and presented data if verified.',
    status: HttpStatus.OK,
  })
  @ApiUnauthorizedResponse({ description: 'The user is unauthorized.' })
  @ApiForbiddenResponse({ description: 'The user is forbidden to perform this action.' })
  @ApiNotFoundResponse({ description: 'Verification session not found.' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error has occured.' })
  @Get('sessions/:sessionId')
  async getSessionStatus(@Param('sessionId') sessionId: string, @Req() req: any) {
    return this.verifierService.getSessionById(sessionId, req.user.id);
  }

  @Roles('VERIFIER')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Get all verification sessions created by this verifier' })
  @ApiResponse({ description: 'List of verification sessions.', status: HttpStatus.OK })
  @ApiUnauthorizedResponse({ description: 'The user is unauthorized.' })
  @ApiForbiddenResponse({ description: 'The user is forbidden to perform this action.' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error has occured.' })
  @Get('sessions')
  async getAllSessions(@Req() req: any) {
    return this.verifierService.getSessionsByVerifierId(req.user.id);
  }

  @Public()
  @ApiOperation({ summary: 'Receive Verifiable Presentation (vp_token) from the Wallet' })
  @ApiParam({ name: 'sessionId', description: 'ID of the Verification Session to update' })
  @ApiResponse({ description: 'Wallet successfully submitted the presentation.' })
  @HttpCode(HttpStatus.OK)
  @ApiNotFoundResponse({ description: 'Verification session not found or expired.' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error has occured.' })
  @Post('response/:sessionId')
  async handleWalletResponse(
    @Param('sessionId') sessionId: string,
    @Body() dto: WalletPresentationResponseDto,
  ) {
    return this.verifierService.verifyWalletResponse(sessionId, dto);
  }
}
