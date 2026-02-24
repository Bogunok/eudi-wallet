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

@ApiTags('Verifiable Credentials')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('vc')
export class VcController {
  constructor(private readonly vcService: VcService) {}

  // Видача нового документа (LEI)
  // Викликається після того, як юзер ввів PIN на сторінці "Paste link"
  @Roles('ISSUER')
  @ApiOperation({ summary: 'Issue and save a new Verifiable Credential' })
  @ApiParam({
    name: 'organizationId',
    description: 'ID of the organization for which the credential is issued',
  })
  @ApiResponse({ description: 'Verifiable Credential issued and saved successfully.' })
  @ApiUnauthorizedResponse({ description: 'The user is unauthorized.' })
  @ApiForbiddenResponse({ description: 'The user is forbidden to perform this action.' })
  @ApiNotFoundResponse({ description: 'The user with the requested id was not found.' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error has occured.' })
  @Post('issue')
  async issue(@Body() dto: CreateVerifiableCredentialDto, @Req() req) {
    return this.vcService.issueAndSaveCredential(dto, req.user.id);
  }

  //Список усіх документів організації
  //Потрібен для екрана "View all documents"
  @Roles('ISSUER')
  @ApiOperation({ summary: 'Get all active Verifiable Credentials for a specific organization' })
  @ApiParam({ name: 'organizationId', description: 'ID of the organization' })
  @ApiResponse({ description: 'List of active Verifiable Credentials retrieved successfully.' })
  @ApiUnauthorizedResponse({ description: 'The user is unauthorized.' })
  @ApiForbiddenResponse({ description: 'The user is forbidden to perform this action.' })
  @ApiNotFoundResponse({ description: 'The user with the requested id was not found.' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error has occured.' })
  @Get('org/:orgId')
  async findAll(@Param('orgId') orgId: string, @Req() req) {
    return this.vcService.findAllCredentials(orgId, req.user.id);
  }

  //Деталі одного документа
  //Використовується при натисканні на картку документа
  @Roles('HOLDER','ISSUER')
  @ApiOperation({ summary: 'Get verifiable credential by ID' })
  @ApiParam({ name: 'id', description: 'ID of the Verifiable Credential' })
  @ApiResponse({ description: 'Verifiable Credential retrieved successfully.' })
  @ApiUnauthorizedResponse({ description: 'The user is unauthorized.' })
  @ApiForbiddenResponse({ description: 'The user is forbidden to perform this action.' })
  @ApiNotFoundResponse({ description: 'The user with the requested id was not found.' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error has occured.' })
  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req: any) {
    return this.vcService.findCredentialById(id, req.user.id);
  }

  @Roles('HOLDER')
  @ApiOperation({ summary: 'Delete verifiable credential locally' })
  @ApiResponse({ description: 'Document successfully deleted locally' })
  @ApiUnauthorizedResponse({ description: 'The user is unauthorized.' })
  @ApiForbiddenResponse({ description: 'The user is forbidden to perform this action.' })
  @ApiNotFoundResponse({ description: 'The user with the requested id was not found.' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error has occured.' })
  @Delete(':id')
  async remove(@Param('id') id: string, @Req() req: any) {
    return this.vcService.deleteCredentialLocally(id, req.user.id);
  }

   @Roles('ISSUER')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Revoke VC (only for the issuer)' })
  @ApiParam({ name: 'id', description: 'ID Verifiable Credential' })
  @ApiResponse({ description: 'Document successfully revoked' })
  @ApiUnauthorizedResponse({ description: 'The user is unauthorized.' })
  @ApiForbiddenResponse({ description: 'The user is forbidden to perform this action.' })
  @ApiNotFoundResponse({ description: 'The user with the requested id was not found.' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error has occured.' })
  @Patch(':id/revoke')
  async revokeCredential(@Param('id') id: string, @Req() req: any) {
    // req.user.id - це ID організації, яка робить запит
    return await this.vcService.revokeCredential(id, req.user.id);
  }
}
