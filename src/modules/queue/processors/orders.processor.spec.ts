jest.mock('../../orders/orders.service', () => ({
  OrdersService: class OrdersService {},
}));

import type { Job } from 'bullmq';
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
    const processor = new OrdersProcessor(
      ordersService as unknown as OrdersService,
    );

    await processor.process({
      name: PROCESS_ORDER_JOB,
      data: {
        orderId: order.id,
      },
    } as Job<{ orderId: string }>);

    expect(ordersService.getOrderById).toHaveBeenCalledWith(order.id);
    expect(ordersService.markAsProcessing).toHaveBeenCalledWith(order.id);
    expect(ordersService.markAsEnriched).toHaveBeenCalledWith(
      order.id,
      expect.objectContaining({
        enrichedAmount: order.totalAmount,
        enrichedCurrency: order.currency,
        enrichmentPayload: expect.objectContaining({
          provider: 'mock',
        }),
      }),
    );
  });
});
