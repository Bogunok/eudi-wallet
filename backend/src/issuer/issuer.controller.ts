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
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { IssuerService } from './issuer.service';
import { ApproveRequestDto } from './dto/approve-request.dto';

@ApiTags('Issuer Dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ISSUER')
@Controller('issuer')
export class IssuerController {
  constructor(private readonly issuerService: IssuerService) {}

  @ApiOperation({ summary: 'Get pending requests for the issuer' })
  @ApiUnauthorizedResponse({ description: 'The user is unauthorized.' })
  @ApiForbiddenResponse({ description: 'The user is forbidden to perform this action.' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error has occured.' })
  @Get('requests')
  async getRequests(@Req() req: any) {
    return this.issuerService.getPendingRequests(req.user.id);
  }

  @ApiOperation({ summary: 'Approve a pending request and issue a credential' })
  @ApiResponse({ description: 'Verifiable Credential issued and saved successfully.' })
  @ApiUnauthorizedResponse({ description: 'The user is unauthorized.' })
  @ApiForbiddenResponse({ description: 'The user is forbidden to perform this action.' })
  @ApiNotFoundResponse({ description: 'The user with the requested id was not found.' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error has occured.' })
  @Post('requests/:id/approve')
  async approveRequest(
    @Param('id') requestId: string,
    @Body() dto: ApproveRequestDto,
    @Req() req: any,
  ) {
    return this.issuerService.approveRequestAndIssue(requestId, req.user.id, dto);
  }

  @ApiOperation({ summary: 'Revoke an already issued credential' })
  @ApiParam({ name: 'id', description: 'ID Verifiable Credential' })
  @ApiResponse({ description: 'Document successfully revoked' })
  @ApiUnauthorizedResponse({ description: 'The user is unauthorized.' })
  @ApiForbiddenResponse({ description: 'The user is forbidden to perform this action.' })
  @ApiNotFoundResponse({ description: 'The user with the requested id was not found.' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error has occured.' })
  @Patch('vc/:id/revoke')
  async revokeCredential(@Param('id') vcId: string, @Req() req: any) {
    return this.issuerService.revokeCredential(vcId, req.user.id);
  }
}
