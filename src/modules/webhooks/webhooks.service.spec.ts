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
import type { QueueService } from '../queue/queue.service';
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
    status: 'RECEIVED',
    items: [],
  };

  function createService(
    ordersService: Partial<jest.Mocked<OrdersService>>,
    queueService: Partial<jest.Mocked<QueueService>> = {
      enqueueOrderProcessing: jest.fn(),
    },
  ) {
    return new WebhooksService(
      ordersService as jest.Mocked<OrdersService>,
      queueService as jest.Mocked<QueueService>,
    );
  }

  it('returns an existing order for a repeated idempotency key', async () => {
    const ordersService = {
      findByIdempotencyKey: jest.fn().mockResolvedValue(existingOrder),
      createOrder: jest.fn(),
    };
    const queueService = {
      enqueueOrderProcessing: jest.fn(),
    };
    const service = createService(ordersService, queueService);

    await expect(service.createOrderFromWebhook(dto)).resolves.toEqual({
      id: existingOrder.id,
      status: existingOrder.status,
    });
    expect(ordersService.createOrder).not.toHaveBeenCalled();
    expect(queueService.enqueueOrderProcessing).not.toHaveBeenCalled();
  });

  it('enqueues a newly created order for async processing', async () => {
    const ordersService = {
      findByIdempotencyKey: jest.fn().mockResolvedValue(null),
      createOrder: jest.fn().mockResolvedValue(existingOrder),
    };
    const queueService = {
      enqueueOrderProcessing: jest.fn().mockResolvedValue({ id: 'job-1' }),
    };
    const service = createService(ordersService, queueService);

    await expect(service.createOrderFromWebhook(dto)).resolves.toEqual({
      id: existingOrder.id,
      status: existingOrder.status,
    });
    expect(queueService.enqueueOrderProcessing).toHaveBeenCalledWith(
      existingOrder.id,
    );
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
    const queueService = {
      enqueueOrderProcessing: jest.fn(),
    };
    const service = createService(ordersService, queueService);

    await expect(service.createOrderFromWebhook(dto)).resolves.toEqual({
      id: existingOrder.id,
      status: existingOrder.status,
    });
    expect(ordersService.findByIdempotencyKey).toHaveBeenCalledTimes(2);
    expect(queueService.enqueueOrderProcessing).not.toHaveBeenCalled();
  });
});
