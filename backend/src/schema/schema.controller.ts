import { Controller, Post, Body, Get, Param, Req, Delete } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiBadRequestResponse,
} from '@nestjs/swagger';
import { SchemaService } from './schema.service';
import { CreateSchemaDto } from './dto/create-schema.dto';
import { Role } from '@prisma/client';
import { Auth } from 'src/auth/decorators/auth.decorator';

@ApiTags('Credential Schemas')
@Controller('schemas')
export class SchemaController {
  constructor(private readonly schemaService: SchemaService) {}

  @Auth(Role.ISSUER)
  @ApiOperation({ summary: 'Create a new schema (Only for Issuers)' })
  @ApiResponse({ status: 201, description: 'Schema created successfully.' })
  @ApiUnauthorizedResponse({ description: 'The user is unauthorized.' })
  @ApiForbiddenResponse({ description: 'The user is forbidden to perform this action.' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error has occured.' })
  @Post()
  async create(@Body() dto: CreateSchemaDto, @Req() req: any) {
    const issuerId = req.user.id;
    return this.schemaService.createSchema(dto, issuerId);
  }

  // перегляд Тільки для Емітентів
  @Auth(Role.ISSUER)
  @ApiOperation({ summary: 'Get list of schemas for this organization' })
  @ApiResponse({ status: 200, description: 'Schema list retrieved successfully.' })
  @ApiUnauthorizedResponse({ description: 'The user is unauthorized.' })
  @ApiForbiddenResponse({ description: 'The user is forbidden to perform this action.' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error has occured.' })
  @Get()
  async findAll(@Req() req: any) {
    const issuerId = req.user.id;
    return this.schemaService.findAllSchemasByIssuer(issuerId);
  }

  @Auth(Role.ISSUER)
  @ApiOperation({ summary: 'Delete a schema by ID (Only for Issuers)' })
  @ApiParam({ name: 'id', description: 'ID of the schema to delete' })
  @ApiResponse({ status: 200, description: 'Schema deleted successfully.' })
  @ApiUnauthorizedResponse({ description: 'The user is unauthorized.' })
  @ApiForbiddenResponse({ description: 'You can only delete your own schemas.' })
  @ApiNotFoundResponse({ description: 'Schema not found.' })
  @ApiBadRequestResponse({ description: 'Cannot delete schema with existing requests.' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error has occured.' })
  @Delete(':id')
  async delete(@Param('id') id: string, @Req() req: any) {
    return this.schemaService.deleteSchema(id, req.user.id);
  }

  @Auth(Role.HOLDER)
  @ApiOperation({ summary: 'Get all available schemas from all trusted issuers (for Holder)' })
  @Get('available')
  async getAvailableSchemas() {
    return this.schemaService.findAllAvailableSchemas();
  }

  // перегляд схеми (для всіх)
  @ApiOperation({ summary: 'Get public schema structure (For all)' })
  @ApiParam({ name: 'schemaId', description: 'ID of the schema from database' })
  @ApiResponse({ status: 200, description: 'Schema retrieved successfully.' })
  @ApiNotFoundResponse({ description: 'Schema with given ID not found.' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error has occured.' })
  @Get(':schemaId')
  async getSchema(@Param('schemaId') schemaId: string) {
    return this.schemaService.findSchemaById(schemaId);
  }
}
