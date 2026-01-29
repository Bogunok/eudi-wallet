import { Controller, Post, Body, Req, UseGuards } from '@nestjs/common'; 
import { OrganizationService } from './organization.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'; 
import { CreateOrganizationDto } from './dto/create-organization.dto'; 

@Controller('organization')
export class OrganizationController {
  constructor(private readonly organizationService: OrganizationService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  async create(@Body() dto: CreateOrganizationDto, @Req() req: any) {
    return this.organizationService.create(dto, req.user.id);
  }
}