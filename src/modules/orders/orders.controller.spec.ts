jest.mock('../../../generated/prisma/client', () => ({
  OrderStatus: {
    RECEIVED: 'RECEIVED',
    PROCESSING: 'PROCESSING',
    ENRICHED: 'ENRICHED',
    FAILED_ENRICHMENT: 'FAILED_ENRICHMENT',
  },
}));

jest.mock('./orders.service', () => ({
  OrdersService: class OrdersService {},
}));

import { OrderStatus } from '../../../generated/prisma/client';
import type { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';

describe('OrdersController', () => {
  function createController(
    ordersService: Partial<jest.Mocked<OrdersService>>,
  ) {
    return new OrdersController(ordersService as jest.Mocked<OrdersService>);
  }

  it('lists orders with an optional status filter', async () => {
    const orders = [{ id: 'order-1', status: OrderStatus.ENRICHED }];
    const ordersService = {
      listOrders: jest.fn().mockResolvedValue(orders),
    };
    const controller = createController(ordersService);

    await expect(
      controller.listOrders({ status: OrderStatus.ENRICHED }),
    ).resolves.toBe(orders);
    expect(ordersService.listOrders).toHaveBeenCalledWith(OrderStatus.ENRICHED);
  });

  it('gets an order by id', async () => {
    const order = { id: 'order-1' };
    const ordersService = {
      getOrderById: jest.fn().mockResolvedValue(order),
    };
    const controller = createController(ordersService);

    await expect(controller.getOrderById(order.id)).resolves.toBe(order);
    expect(ordersService.getOrderById).toHaveBeenCalledWith(order.id);
  });
});
