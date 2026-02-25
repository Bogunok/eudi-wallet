import { Controller, Post, Body, Req, UseGuards, Get, Patch } from '@nestjs/common';
import { OrganizationService } from './organization.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import {
  ApiForbiddenResponse,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';

@ApiTags('Organizations')
@Controller('organization')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OrganizationController {
  constructor(private readonly organizationService: OrganizationService) {}

  @Roles('HOLDER')
  @ApiResponse({ description: 'Organization created successfully.' })
  @ApiUnauthorizedResponse({ description: 'The user is unauthorized.' })
  @ApiForbiddenResponse({ description: 'The user is forbidden to perform this action.' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error has occured.' })
  @Post()
  async create(@Body() dto: CreateOrganizationDto, @Req() req: any) {
    return this.organizationService.create(dto, req.user.id);
  }

  @Roles('HOLDER')
  @ApiOperation({ summary: 'Get my organization details' })
  @ApiUnauthorizedResponse({ description: 'The user is unauthorized.' })
  @ApiNotFoundResponse({ description: 'The organization was not found.' })
  @ApiForbiddenResponse({ description: 'The user is forbidden to perform this action.' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error has occured.' })
  @Get('my')
  async getOrganization(@Req() req: any) {
    return this.organizationService.findMyOrganization(req.user.id);
  }

  @Roles('HOLDER')
  @ApiOperation({ summary: 'Update organization profile (name, country)' })
  @ApiNotFoundResponse({ description: 'The organization was not found.' })
  @ApiUnauthorizedResponse({ description: 'The user is unauthorized.' })
  @ApiForbiddenResponse({ description: 'The user is forbidden to perform this action.' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error has occured.' })
  @Patch('my')
  async update(@Body() dto: UpdateOrganizationDto, @Req() req: any) {
    return this.organizationService.updateMyOrganization(req.user.id, dto);
  }

  @Roles('HOLDER')
  @ApiOperation({ summary: 'Generate did to obtain VC' })
  @ApiUnauthorizedResponse({ description: 'The user is unauthorized.' })
  @ApiForbiddenResponse({ description: 'The user is forbidden to perform this action.' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error has occured.' })
  @Post('setup-did')
  async setupDid(@Body() body: { pin: string; domain: string }, @Req() req: any) {
    return this.organizationService.setupOrganizationDid(req.user.id, body.pin, body.domain);
  }
}
