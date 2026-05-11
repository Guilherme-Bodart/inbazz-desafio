jest.mock('../../generated/prisma/client', () => ({
  OrderStatus: {
    RECEIVED: 'RECEIVED',
    PROCESSING: 'PROCESSING',
    ENRICHED: 'ENRICHED',
    FAILED_ENRICHMENT: 'FAILED_ENRICHMENT',
  },
}));

jest.mock('../../src/modules/webhooks/webhooks.service', () => ({
  WebhooksService: class WebhooksService {},
}));

jest.mock('../../src/modules/orders/orders.service', () => ({
  OrdersService: class OrdersService {},
}));

jest.mock('../../src/modules/queue/queue.service', () => ({
  QueueService: class QueueService {},
}));
