import { Controller, Post, Get, UseGuards, Request, Body, HttpCode, HttpStatus, Patch } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiOperation } from '@nestjs/swagger/dist/decorators/api-operation.decorator';
import { ChangePinDto } from './dto/change-pin.dto';

@Controller('wallet')
@UseGuards(JwtAuthGuard)
export class WalletController {
  authService: any;
  constructor(private readonly walletService: WalletService) {}

  @Post('create-did')
  createDid(@Request() req) {
    // З токена дістаємо ID користувача (req.user.id)
    // Це гарантує, що ми створюємо DID саме для того, хто залогінився
    return this.walletService.createDid(req.user.id);
  }

  @Get('dids')
  getMyDids(@Request() req) {
    return this.walletService.getMyDids(req.user.id);
  }

 @Patch('change-pin')
  @ApiOperation({ summary: 'Змінити PIN-код гаманця' })
  async updatePin(@Request() req, @Body() dto: ChangePinDto) {
    return this.walletService.changePin(req.user.id, dto.oldPin, dto.newPin);
  }

  @Post('reset-pin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Повне скидання гаманця (видалення DID та VC)' })
  async reset(@Request() req) {
    return this.walletService.resetWallet(req.user.id);
  }
}
