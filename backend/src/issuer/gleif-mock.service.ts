import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';

//GLEIF (Global Legal Entity Identifier Foundation) list mock for issuer to check whether
//organization can be issued documents
@Injectable()
export class GleifMockService {
  private readonly logger = new Logger(GleifMockService.name);

  private readonly mockRegistry = {
    '529900T8BM49AURSDO55': {
      legalName: 'Green Energy Solutions',
      country: 'UA',
      status: 'ISSUED',
    },
    '777700T8BM49AURSDO77': {
      legalName: 'Green Energy Solutions',
      country: 'UA',
      status: 'ISSUED',
    },
    '894500T8BM49AURSDO99': {
      legalName: 'Green Hydrogen IoT Systems',
      country: 'UA',
      status: 'ISSUED',
    },
    '12345678901234567890': {
      legalName: 'Bad Company LLC',
      country: 'US',
      status: 'EXPIRED',
    },
  };

  // simulate request to API register to check the data
  async verifyOrganization(leiCode: string, declaredName: string): Promise<boolean> {
    if (!leiCode || !declaredName) return false;
    //симуляція мережевої затримки
    await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));

    const failureDeviation = Math.random();
    if (failureDeviation < 0.08) {
      this.logger.warn(`[GLEIF Mock] Simulated external API timeout for LEI: ${leiCode}`);
      throw new InternalServerErrorException(
        'External LEI registry is temporarily unavailable. Please try again later.',
      );
    }

    const record = this.mockRegistry[leiCode];

    if (!record) {
      this.logger.log(`[GLEIF Mock] LEI ${leiCode} not found in registry.`);
      return false;
    }

    if (record.status !== 'ISSUED') {
      this.logger.log(`[GLEIF Mock] LEI ${leiCode} is not active. Status: ${record.status}`);
      return false;
    }

    if (record.legalName.toLowerCase() !== declaredName.toLowerCase()) {
      this.logger.log(
        `[GLEIF Mock] Name mismatch. Declared: ${declaredName}, Official: ${record.legalName}`,
      );
      return false;
    }

    return true;
  }
}
