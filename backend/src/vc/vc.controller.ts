import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { VcService } from './vc.service';
import { CreateCredentialDto } from './dto/create-credential.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';

@ApiTags('Verifiable Credentials')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('vc')
export class VcController {
  constructor(private readonly vcService: VcService) {}

  /**
   * 1. Видача нового документа (LEI)
   * Викликається після того, як юзер ввів PIN на сторінці "Paste link"
   */
  @Post('issue')
  @ApiOperation({ summary: 'Видати та зберегти новий Verifiable Credential' })
  @ApiResponse({
    status: 201,
    description: 'Документ успішно створено та підписано',
  })
  async issue(@Body() dto: CreateCredentialDto, @Request() req) {
    // req.user.id береться з JWT токена після авторизації
    return this.vcService.issueAndSaveCredential(dto, req.user.id);
  }

  /**
   * 2. Список усіх документів організації
   * Потрібен для екрана "View all documents"
   */
  @Get('org/:orgId')
  @ApiOperation({
    summary: 'Отримати всі активні документи конкретної організації',
  })
  async findAll(@Param('orgId') orgId: string, @Request() req) {
    return this.vcService.findAllCredentials(orgId, req.user.id);
  }

  /**
   * 3. Деталі одного документа
   * Використовується при натисканні на картку документа
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Отримати детальні дані конкретного документа за ID',
  })
  async findOne(@Param('id') id: string) {
    return this.vcService.findCredentialById(id);
  }

  // 4. Видалення документа
  @Delete(':id')
  @ApiOperation({
    summary: 'Локальне видалення документа (зміна статусу на DELETED)',
  })
  async remove(@Param('id') id: string) {
    return this.vcService.deleteCredentialLocally(id);
  }
}
