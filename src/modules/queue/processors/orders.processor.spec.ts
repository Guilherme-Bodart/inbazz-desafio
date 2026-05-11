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
    const processor = new OrdersProcessor(
      ordersService as unknown as OrdersService,
      enrichmentService as unknown as EnrichmentService,
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
});
