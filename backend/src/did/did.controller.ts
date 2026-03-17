import { DidService } from './did.service';
import { Body, Post, Controller, Req, Param, Get, Patch } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiNotFoundResponse,
  ApiInternalServerErrorResponse,
  ApiForbiddenResponse,
  ApiUnauthorizedResponse,
  ApiParam,
} from '@nestjs/swagger';
import { GenerateDidDto } from './dto/generate-did.dto';
import { Auth } from '../auth/decorators/auth.decorator';

//update method is optional, as the DID document is generated once and usually does not require updates.
// However, if there is a need to update certain fields (e.g., adding new public keys or updating service endpoints),
// an update method can be implemented in the DidService and exposed through the DidController.

@ApiTags('DID Management')
@Controller('did')
export class DidController {
  constructor(private readonly didService: DidService) {}

  @Auth()
  @ApiOperation({ summary: 'Generate DID document for an organization' })
  @ApiResponse({ description: 'DID document generated successfully' })
  @ApiUnauthorizedResponse({ description: 'The user is unauthorized.' })
  @ApiForbiddenResponse({ description: 'The user is forbidden to perform this action.' })
  @ApiNotFoundResponse({ description: 'The user with the requested id was not found.' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error has occured.' })
  @Post('generate')
  async generateDid(@Body() dto: GenerateDidDto, @Req() req: any) {
    const userId = req.user.id;
    return await this.didService.generateDidWebData(userId, dto.pin, dto.domain);
  }

  @Auth()
  @ApiOperation({ summary: 'Get all user DIDs' })
  @ApiResponse({ status: 200, description: 'DIDs retrieved successfully.' })
  @ApiUnauthorizedResponse({ description: 'The user is unauthorized.' })
  @ApiForbiddenResponse({ description: 'The user is forbidden to perform this action.' })
  @Get('my-dids')
  async getMyDids(@Req() req: any) {
    return this.didService.getMyDids(req.user.id);
  }

  //хто завгодно може отримати публічний DID документ, тому цей ендпоінт не захищений
  @ApiOperation({ summary: 'Resolve (read) public DID document' })
  @ApiParam({ name: 'did', example: 'did:web:knu.ua' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error has occured.' })
  @Get('resolve/:did')
  async resolveDid(@Param('did') did: string) {
    return await this.didService.resolveDid(did);
  }

  @Auth()
  @ApiOperation({ summary: 'Deactivate DID document' })
  @ApiParam({ name: 'did', example: 'did:web:knu.ua' })
  @ApiUnauthorizedResponse({ description: 'The user is unauthorized.' })
  @ApiForbiddenResponse({ description: 'The user is forbidden to perform this action.' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error has occured.' })
  @Patch('deactivate/:did')
  async deactivateDid(@Req() req: any, @Param('did') did: string) {
    const userId = req.user.id;
    return await this.didService.deactivateDid(did, userId);
  }
}
