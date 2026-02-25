import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  Req,
  Patch,
} from '@nestjs/common';
import { VcService } from './vc.service';
import { CreateVerifiableCredentialDto } from './dto/create-credential.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiParam,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiInternalServerErrorResponse,
} from '@nestjs/swagger';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RequestCredentialDto } from './dto/request-credential.dto';

@ApiTags('Verifiable Credentials (Wallet)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('vc')
export class VcController {
  constructor(private readonly vcService: VcService) {}

  //Список усіх документів організації
  @Roles('HOLDER')
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
  @Roles('HOLDER')
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

  @Roles('HOLDER')
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

  @Roles('HOLDER')
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
