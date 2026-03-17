import { Controller, Post, Get, Delete, Body, Param, Req } from '@nestjs/common';
import { VcService } from './vc.service';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiInternalServerErrorResponse,
} from '@nestjs/swagger';
import { RequestCredentialDto } from './dto/request-credential.dto';
import { Role } from '@prisma/client';
import { Auth } from '../auth/decorators/auth.decorator';

@ApiTags('Verifiable Credentials (Wallet)')
@Controller('vc')
export class VcController {
  constructor(private readonly vcService: VcService) {}

  //Список усіх документів організації
  @Auth(Role.HOLDER)
  @ApiOperation({ summary: 'Get all active Verifiable Credentials for a specific organization' })
  @ApiParam({ name: 'orgId', description: 'ID of the organization (Holder)' })
  @ApiResponse({ description: 'List of active Verifiable Credentials retrieved successfully.' })
  @ApiUnauthorizedResponse({ description: 'The user is unauthorized.' })
  @ApiForbiddenResponse({ description: 'The user is forbidden to perform this action.' })
  @ApiNotFoundResponse({ description: 'The user with the requested id was not found.' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error has occured.' })
  @Get('org/:orgId')
  async getAllCredentials(@Param('orgId') orgId: string, @Req() req) {
    return this.vcService.findAllCredentials(orgId, req.user.id);
  }

  //Деталі одного документа
  @Auth(Role.HOLDER)
  @ApiOperation({ summary: 'Get verifiable credential by ID' })
  @ApiParam({ name: 'id', description: 'ID of the Verifiable Credential' })
  @ApiResponse({ description: 'Verifiable Credential retrieved successfully.' })
  @ApiUnauthorizedResponse({ description: 'The user is unauthorized.' })
  @ApiForbiddenResponse({ description: 'The user is forbidden to perform this action.' })
  @ApiNotFoundResponse({ description: 'The document with the requested id was not found.' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error has occured.' })
  @Get(':id')
  async getCredentialDetails(@Param('id') id: string, @Req() req: any) {
    return this.vcService.findCredentialById(id, req.user.id);
  }

  @Auth(Role.HOLDER)
  @ApiOperation({ summary: 'Request Verifiable Credential from Issuer' })
  @ApiResponse({ description: 'Verifiable Credential requested successfully.' })
  @ApiUnauthorizedResponse({ description: 'The user is unauthorized.' })
  @ApiForbiddenResponse({ description: 'The user is forbidden to perform this action.' })
  @ApiNotFoundResponse({ description: 'Schema or Issuer not found.' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error has occured.' })
  @Post('request')
  async requestCredential(@Body() dto: RequestCredentialDto, @Req() req: any) {
    return this.vcService.requestCredentialFromIssuer(dto, req.user.id);
  }

  @Auth(Role.HOLDER)
  @ApiOperation({ summary: 'Delete verifiable credential locally' })
  @ApiResponse({ description: 'Document successfully deleted locally' })
  @ApiUnauthorizedResponse({ description: 'The user is unauthorized.' })
  @ApiForbiddenResponse({ description: 'The user is forbidden to perform this action.' })
  @ApiNotFoundResponse({ description: 'The document was not found.' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error has occured.' })
  @Delete(':id')
  async remove(@Param('id') id: string, @Req() req: any) {
    return this.vcService.deleteCredentialLocally(id, req.user.id);
  }
}
