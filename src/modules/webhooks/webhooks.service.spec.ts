jest.mock('../../../generated/prisma/client', () => {
  class PrismaClientKnownRequestError extends Error {
    code: string;
    clientVersion: string;
    meta?: Record<string, unknown>;

    constructor(
      message: string,
      {
        code,
        clientVersion,
        meta,
      }: {
        code: string;
        clientVersion: string;
        meta?: Record<string, unknown>;
      },
    ) {
      super(message);
      this.name = 'PrismaClientKnownRequestError';
      this.code = code;
      this.clientVersion = clientVersion;
      this.meta = meta;
    }
  }

  return {
    OrderStatus: {
      RECEIVED: 'RECEIVED',
    },
    Prisma: {
      PrismaClientKnownRequestError,
      prismaVersion: {
        client: 'test',
      },
    },
  };
});

jest.mock('../orders/orders.service', () => ({
  OrdersService: class OrdersService {},
}));

import { Prisma } from '../../../generated/prisma/client';
import type { OrdersService } from '../orders/orders.service';
import { WebhooksService } from './webhooks.service';

describe('WebhooksService', () => {
  const dto = {
    order_id: 'ext-123',
    customer: {
      email: 'user@example.com',
      name: 'Ana',
    },
    items: [
      {
        sku: 'ABC123',
        qty: 2,
        unit_price: 59.9,
      },
    ],
    currency: 'USD',
    idempotency_key: 'same-key',
  };

  const existingOrder = {
    id: 'order-1',
    idempotencyKey: dto.idempotency_key,
    items: [],
  };

  function createService(ordersService: Partial<jest.Mocked<OrdersService>>) {
    return new WebhooksService(ordersService as jest.Mocked<OrdersService>);
  }

  it('returns an existing order for a repeated idempotency key', async () => {
    const ordersService = {
      findByIdempotencyKey: jest.fn().mockResolvedValue(existingOrder),
      createOrder: jest.fn(),
    };
    const service = createService(ordersService);

    await expect(service.createOrderFromWebhook(dto)).resolves.toBe(
      existingOrder,
    );
    expect(ordersService.createOrder).not.toHaveBeenCalled();
  });

  it('returns the persisted order when a concurrent create hits the unique constraint', async () => {
    const uniqueConstraintError = new Prisma.PrismaClientKnownRequestError(
      'Unique constraint failed',
      {
        code: 'P2002',
        clientVersion: Prisma.prismaVersion.client,
        meta: {
          target: ['idempotency_key'],
        },
      },
    );
    const ordersService = {
      findByIdempotencyKey: jest
        .fn()
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(existingOrder),
      createOrder: jest.fn().mockRejectedValue(uniqueConstraintError),
    };
    const service = createService(ordersService);

    await expect(service.createOrderFromWebhook(dto)).resolves.toBe(
      existingOrder,
    );
    expect(ordersService.findByIdempotencyKey).toHaveBeenCalledTimes(2);
  });
});
