jest.mock('../../orders/orders.service', () => ({
  OrdersService: class OrdersService {},
}));

import type { Job } from 'bullmq';
import type { EnrichmentService } from '../../enrichment/enrichment.service';
import type { OrdersService } from '../../orders/orders.service';
import { PROCESS_ORDER_JOB } from '../queue.service';
import { OrdersProcessor } from './orders.processor';

describe('OrdersProcessor', () => {
  it('marks an order as processing and then enriched with mock data', async () => {
    const order = {
      id: 'order-1',
      totalAmount: '119.80',
      currency: 'USD',
    };
    const ordersService = {
      getOrderById: jest.fn().mockResolvedValue(order),
      markAsProcessing: jest.fn().mockResolvedValue(undefined),
      markAsEnriched: jest.fn().mockResolvedValue(undefined),
      markAsFailedEnrichment: jest.fn(),
    };
    const enrichmentData = {
      enrichedAmount: '658.90',
      enrichedCurrency: 'BRL',
      enrichmentPayload: {
        provider: 'frankfurter',
      },
    };
    const enrichmentService = {
      convertOrderTotal: jest.fn().mockResolvedValue(enrichmentData),
    };
    const ordersDlq = {
      add: jest.fn(),
    };
    const processor = new OrdersProcessor(
      ordersService as unknown as OrdersService,
      enrichmentService as unknown as EnrichmentService,
      ordersDlq as never,
    );

    await processor.process({
      name: PROCESS_ORDER_JOB,
      data: {
        orderId: order.id,
      },
    } as Job<{ orderId: string }>);

    expect(ordersService.getOrderById).toHaveBeenCalledWith(order.id);
    expect(ordersService.markAsProcessing).toHaveBeenCalledWith(order.id);
    expect(enrichmentService.convertOrderTotal).toHaveBeenCalledWith(
      order.totalAmount,
      order.currency,
    );
    expect(ordersService.markAsEnriched).toHaveBeenCalledWith(
      order.id,
      enrichmentData,
    );
  });

  it('keeps failed jobs out of the DLQ while retries remain', async () => {
    const ordersService = {
      markAsFailedEnrichment: jest.fn(),
    };
    const ordersDlq = {
      add: jest.fn(),
    };
    const processor = new OrdersProcessor(
      ordersService as unknown as OrdersService,
      {} as EnrichmentService,
      ordersDlq as never,
    );

    await processor.onFailed(
      {
        name: PROCESS_ORDER_JOB,
        data: {
          orderId: 'order-1',
        },
        attemptsMade: 1,
        failedReason: 'timeout',
        opts: {
          attempts: 3,
        },
      } as Job<{ orderId: string }>,
      new Error('timeout'),
    );

    expect(ordersService.markAsFailedEnrichment).not.toHaveBeenCalled();
    expect(ordersDlq.add).not.toHaveBeenCalled();
  });

  it('marks the order as failed and sends it to the DLQ after all retries fail', async () => {
    const ordersService = {
      markAsFailedEnrichment: jest.fn().mockResolvedValue(undefined),
    };
    const ordersDlq = {
      add: jest.fn().mockResolvedValue({ id: 'order-1' }),
    };
    const processor = new OrdersProcessor(
      ordersService as unknown as OrdersService,
      {} as EnrichmentService,
      ordersDlq as never,
    );

    await processor.onFailed(
      {
        name: PROCESS_ORDER_JOB,
        data: {
          orderId: 'order-1',
        },
        attemptsMade: 3,
        failedReason: 'timeout',
        opts: {
          attempts: 3,
        },
      } as Job<{ orderId: string }>,
      new Error('exchange provider unavailable'),
    );

    expect(ordersService.markAsFailedEnrichment).toHaveBeenCalledWith(
      'order-1',
      'exchange provider unavailable',
    );
    expect(ordersDlq.add).toHaveBeenCalledWith(
      'failed-order',
      {
        orderId: 'order-1',
        failedReason: 'exchange provider unavailable',
        attemptsMade: 3,
      },
      {
        jobId: 'order-1',
      },
    );
  });
});
