import { Controller, Get, Post, Patch, Param, Body, UseGuards, Req } from '@nestjs/common';
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
import { IssuerService } from './issuer.service';
import { ApproveRequestDto } from './dto/approve-request.dto';
import { Role } from '@prisma/client';
import { Auth } from '../auth/decorators/auth.decorator';

@ApiTags('Issuer Dashboard')
@Controller('issuer')
export class IssuerController {
  constructor(private readonly issuerService: IssuerService) {}

  @Auth(Role.ISSUER)
  @ApiOperation({ summary: 'Get pending requests for the issuer' })
  @ApiUnauthorizedResponse({ description: 'The user is unauthorized.' })
  @ApiForbiddenResponse({ description: 'The user is forbidden to perform this action.' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error has occured.' })
  @Get('requests')
  async getRequests(@Req() req: any) {
    return this.issuerService.getPendingRequests(req.user.id);
  }

  @Auth(Role.ISSUER)
  @ApiOperation({ summary: 'Approve a pending request and issue a credential' })
  @ApiResponse({ description: 'Verifiable Credential issued and saved successfully.' })
  @ApiUnauthorizedResponse({ description: 'The user is unauthorized.' })
  @ApiForbiddenResponse({ description: 'The user is forbidden to perform this action.' })
  @ApiNotFoundResponse({ description: 'The request with such id was not found.' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error has occured.' })
  @Post('requests/:id/approve')
  async approveRequest(
    @Param('id') requestId: string,
    @Body() dto: ApproveRequestDto,
    @Req() req: any,
  ) {
    return this.issuerService.approveRequestAndIssue(requestId, req.user.id, dto);
  }

  @Auth(Role.ISSUER)
  @ApiOperation({ summary: 'Revoke an already issued credential' })
  @ApiParam({ name: 'id', description: 'ID Verifiable Credential' })
  @ApiResponse({ description: 'Document successfully revoked' })
  @ApiUnauthorizedResponse({ description: 'The user is unauthorized.' })
  @ApiForbiddenResponse({ description: 'The user is forbidden to perform this action.' })
  @ApiNotFoundResponse({ description: 'The credential with the requested id was not found.' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error has occured.' })
  @Patch('vc/:id/revoke')
  async revokeCredential(@Param('id') vcId: string, @Req() req: any) {
    return this.issuerService.revokeCredential(vcId, req.user.id);
  }

  @Auth(Role.HOLDER)
  @ApiOperation({ summary: 'Get trusted list of issuers for the wallet directory' })
  @ApiResponse({ description: 'Successfully get trusted list' })
  @ApiUnauthorizedResponse({ description: 'The user is unauthorized.' })
  @ApiForbiddenResponse({ description: 'The user is forbidden to perform this action.' })
  @ApiNotFoundResponse({ description: 'The list with the requested id was not found.' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error has occured.' })
  @Get('trusted-list')
  async getTrustedList() {
    return this.issuerService.getTrustedIssuers();
  }
}
