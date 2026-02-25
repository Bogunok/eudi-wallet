import { Controller, Post, Body, Get, Param, UseGuards, Req } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiParam,
  ApiResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiInternalServerErrorResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { SchemaService } from './schema.service';
import { CreateSchemaDto } from './dto/create-schema.dto';

@ApiTags('Credential Schemas')
@Controller('schemas')
export class SchemaController {
  constructor(private readonly schemaService: SchemaService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ISSUER')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new schema (Only for Issuers)' })
  @ApiResponse({ description: 'Schema created successfully.' })
  @ApiUnauthorizedResponse({ description: 'The user is unauthorized.' })
  @ApiForbiddenResponse({ description: 'The user is forbidden to perform this action.' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error has occured.' })
  @Post('create')
  async create(@Body() dto: CreateSchemaDto, @Req() req: any) {
    const issuerId = req.user.id;
    return this.schemaService.createSchema(dto, issuerId);
  }

  // перегляд Тільки для Емітентів
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ISSUER')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get list of schemas for this organization' })
  @ApiResponse({ description: 'Schema list retrieved successfully.' })
  @ApiUnauthorizedResponse({ description: 'The user is unauthorized.' })
  @ApiForbiddenResponse({ description: 'The user is forbidden to perform this action.' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error has occured.' })
  @Get('my-schemas')
  async findAll(@Req() req: any) {
    const issuerId = req.user.id;
    return this.schemaService.findAllSchemasByIssuer(issuerId);
  }

  // перегляд схеми (для всіх)
  @ApiOperation({ summary: 'Get public schema structure (For all)' })
  @ApiParam({ name: 'schemaId', description: 'ID of the schema from database' })
  @ApiResponse({ description: 'Schema retrieved successfully.' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error has occured.' })
  @Get(':schemaId')
  async getSchema(@Param('schemaId') schemaId: string) {
    return this.schemaService.findSchemaById(schemaId);
  }
}
