import { Controller, Get, Delete, Param, Req } from '@nestjs/common';
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
import { Role } from '@prisma/client';
import { Auth } from '../auth/decorators/auth.decorator';

@ApiTags('Verifiable Credentials (Wallet)')
@Controller('vc')
export class VcController {
  constructor(private readonly vcService: VcService) {}

  @Auth(Role.HOLDER)
  @ApiOperation({ summary: 'Get all active Verifiable Credentials for the current user' })
  @ApiResponse({ description: 'List of active Verifiable Credentials retrieved successfully.' })
  @ApiUnauthorizedResponse({ description: 'The user is unauthorized.' })
  @ApiForbiddenResponse({ description: 'The user is forbidden to perform this action.' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error has occured.' })
  @Get('my')
  async getMyCredentials(@Req() req: any) {
    return this.vcService.findAllCredentialsByUser(req.user.id);
  }

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
