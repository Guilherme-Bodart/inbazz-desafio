import type { ConfigService } from '@nestjs/config';
import type { EnrichmentClient } from './enrichment.client';
import { EnrichmentService } from './enrichment.service';

describe('EnrichmentService', () => {
  function createService(
    enrichmentClient: Partial<jest.Mocked<EnrichmentClient>>,
    targetCurrency = 'BRL',
  ) {
    const configService = {
      get: jest.fn().mockReturnValue(targetCurrency),
    };

    return new EnrichmentService(
      enrichmentClient as jest.Mocked<EnrichmentClient>,
      configService as unknown as ConfigService,
    );
  }

  it('converts an order total using the exchange rate provider', async () => {
    const enrichmentClient = {
      fetchExchangeRate: jest.fn().mockResolvedValue({
        rate: 5.5,
        payload: {
          rate: 5.5,
        },
      }),
    };
    const service = createService(enrichmentClient);

    await expect(service.convertOrderTotal('100.00', 'USD')).resolves.toEqual({
      enrichedAmount: '550.00',
      enrichedCurrency: 'BRL',
      enrichmentPayload: {
        provider: 'frankfurter',
        base: 'USD',
        target: 'BRL',
        rate: 5.5,
        response: {
          rate: 5.5,
        },
      },
    });
    expect(enrichmentClient.fetchExchangeRate).toHaveBeenCalledWith(
      'USD',
      'BRL',
    );
  });

  it('does not call the provider when the order already uses the target currency', async () => {
    const enrichmentClient = {
      fetchExchangeRate: jest.fn(),
    };
    const service = createService(enrichmentClient, 'BRL');

    await expect(service.convertOrderTotal('100.00', 'brl')).resolves.toEqual({
      enrichedAmount: '100.00',
      enrichedCurrency: 'BRL',
      enrichmentPayload: {
        provider: 'local',
        rate: 1,
        base: 'BRL',
        target: 'BRL',
      },
    });
    expect(enrichmentClient.fetchExchangeRate).not.toHaveBeenCalled();
  });
});
