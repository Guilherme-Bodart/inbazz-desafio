import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { OrdersController } from '../../src/modules/orders/orders.controller';
import { OrdersService } from '../../src/modules/orders/orders.service';
import { QueueController } from '../../src/modules/queue/queue.controller';
import { QueueService } from '../../src/modules/queue/queue.service';
import { WebhooksController } from '../../src/modules/webhooks/webhooks.controller';
import { WebhooksService } from '../../src/modules/webhooks/webhooks.service';

export type TestAppMocks = {
  webhooksService: {
    createOrderFromWebhook: jest.Mock;
  };
  ordersService: {
    listOrders: jest.Mock;
    getOrderById: jest.Mock;
  };
  queueService: {
    getMetrics: jest.Mock;
  };
};

export type TestAppContext = {
  app: INestApplication;
  mocks: TestAppMocks;
};

export async function createTestApp(
  overrides: Partial<TestAppMocks> = {},
): Promise<TestAppContext> {
  const mocks: TestAppMocks = {
    webhooksService: {
      createOrderFromWebhook: jest.fn().mockResolvedValue({
        id: 'order-1',
        status: 'RECEIVED',
      }),
      ...overrides.webhooksService,
    },
    ordersService: {
      listOrders: jest.fn().mockResolvedValue([
        {
          id: 'order-1',
          status: 'ENRICHED',
        },
      ]),
      getOrderById: jest.fn().mockResolvedValue({
        id: 'order-1',
        status: 'ENRICHED',
        items: [],
      }),
      ...overrides.ordersService,
    },
    queueService: {
      getMetrics: jest.fn().mockResolvedValue({
        waiting: 1,
        active: 0,
        completed: 2,
        failed: 0,
        delayed: 1,
        dlq: {
          waiting: 0,
          active: 0,
          completed: 0,
          failed: 0,
        },
      }),
      ...overrides.queueService,
    },
  };

  const moduleFixture: TestingModule = await Test.createTestingModule({
    controllers: [WebhooksController, OrdersController, QueueController],
    providers: [
      {
        provide: WebhooksService,
        useValue: mocks.webhooksService,
      },
      {
        provide: OrdersService,
        useValue: mocks.ordersService,
      },
      {
        provide: QueueService,
        useValue: mocks.queueService,
      },
    ],
  }).compile();

  const app = moduleFixture.createNestApplication();
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  await app.init();

  return {
    app,
    mocks,
  };
}

export function requestApp(context: TestAppContext) {
  return request(context.app.getHttpServer() as App);
}
