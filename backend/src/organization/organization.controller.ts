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
import { Auth } from '../auth/decorators/auth.decorator';
import { Role } from '@prisma/client';

@ApiTags('Organizations')
@Controller('organization')
export class OrganizationController {
  constructor(private readonly organizationService: OrganizationService) {}

  @Auth(Role.HOLDER)
  @ApiResponse({ description: 'Organization created successfully.' })
  @ApiUnauthorizedResponse({ description: 'The user is unauthorized.' })
  @ApiForbiddenResponse({ description: 'The user is forbidden to perform this action.' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error has occured.' })
  @Post('create')
  async create(@Body() dto: CreateOrganizationDto, @Req() req: any) {
    return this.organizationService.create(dto, req.user.id);
  }

  @Auth()
  @ApiOperation({ summary: 'Get my organization details' })
  @ApiUnauthorizedResponse({ description: 'The user is unauthorized.' })
  @ApiNotFoundResponse({ description: 'The organization was not found.' })
  @ApiForbiddenResponse({ description: 'The user is forbidden to perform this action.' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error has occured.' })
  @Get('my')
  async getOrganization(@Req() req: any) {
    return this.organizationService.findMyOrganization(req.user.id);
  }

  @Auth()
  @ApiOperation({ summary: 'Update organization profile (name, country)' })
  @ApiNotFoundResponse({ description: 'The organization was not found.' })
  @ApiUnauthorizedResponse({ description: 'The user is unauthorized.' })
  @ApiForbiddenResponse({ description: 'The user is forbidden to perform this action.' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error has occured.' })
  @Patch('my')
  async update(@Body() dto: UpdateOrganizationDto, @Req() req: any) {
    return this.organizationService.updateMyOrganization(req.user.id, dto);
  }

  @Auth()
  @ApiOperation({ summary: 'Generate did to obtain VC' })
  @ApiUnauthorizedResponse({ description: 'The user is unauthorized.' })
  @ApiForbiddenResponse({ description: 'The user is forbidden to perform this action.' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error has occured.' })
  @Post('setup-did')
  async setupDid(@Body() body: { pin: string; domain: string }, @Req() req: any) {
    return this.organizationService.setupOrganizationDid(req.user.id, body.pin, body.domain);
  }
}
