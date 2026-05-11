import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Prisma } from '../../../generated/prisma/client';
import { EnrichmentClient } from './enrichment.client';

@Injectable()
export class EnrichmentService {
  constructor(
    private readonly enrichmentClient: EnrichmentClient,
    private readonly configService: ConfigService,
  ) {}

  async convertOrderTotal(
    totalAmount: Prisma.Decimal | number | string,
    currency: string,
  ) {
    const targetCurrency = this.configService.get<string>(
      'TARGET_CURRENCY',
      'BRL',
    );
    const normalizedCurrency = currency.toUpperCase();
    const normalizedTargetCurrency = targetCurrency.toUpperCase();
    const amount = Number(totalAmount);

    if (normalizedCurrency === normalizedTargetCurrency) {
      return {
        enrichedAmount: amount.toFixed(2),
        enrichedCurrency: normalizedTargetCurrency,
        enrichmentPayload: {
          provider: 'local',
          rate: 1,
          base: normalizedCurrency,
          target: normalizedTargetCurrency,
        },
      };
    }

    const exchangeRate = await this.enrichmentClient.fetchExchangeRate(
      normalizedCurrency,
      normalizedTargetCurrency,
    );

    return {
      enrichedAmount: (amount * exchangeRate.rate).toFixed(2),
      enrichedCurrency: normalizedTargetCurrency,
      enrichmentPayload: {
        provider: 'frankfurter',
        base: normalizedCurrency,
        target: normalizedTargetCurrency,
        rate: exchangeRate.rate,
        response: exchangeRate.payload,
      },
    };
  }
}
