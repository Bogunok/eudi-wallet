import { Controller, Post, Get, UseGuards, Request } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'; // Ваш охоронець!

@Controller('wallet')
@UseGuards(JwtAuthGuard) // <--- ВЕСЬ контролер закритий на замок
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Post('create-did')
  createDid(@Request() req) {
    // З токена ми дістаємо ID користувача (req.user.id)
    // Це гарантує, що ми створюємо DID саме для того, хто залогінився
    return this.walletService.createDid(req.user.id);
  }

  @Get('dids')
  getMyDids(@Request() req) {
    return this.walletService.getMyDids(req.user.id);
  }
}