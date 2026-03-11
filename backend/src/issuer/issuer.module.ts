import { Module } from '@nestjs/common';
import { IssuerController } from './issuer.controller';
import { IssuerService } from './issuer.service';
import { DidModule } from '../did/did.module';
import { GleifMockService } from './gleif-mock.service';

@Module({
  imports: [DidModule],
  controllers: [IssuerController],
  providers: [IssuerService, GleifMockService],
})
export class IssuerModule {}
