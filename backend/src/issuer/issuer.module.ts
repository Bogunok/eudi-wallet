import { Module } from '@nestjs/common';
import { IssuerController } from './issuer.controller';
import { IssuerService } from './issuer.service';
import { DidModule } from '../did/did.module';

@Module({
  imports: [DidModule],
  controllers: [IssuerController],
  providers: [IssuerService],
})
export class IssuerModule {}
