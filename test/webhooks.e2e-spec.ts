import './helpers/prisma.mock';
import {
  TestAppContext,
  createTestApp,
  requestApp,
} from './helpers/create-test-app';

describe('Webhooks flow (e2e)', () => {
  let context: TestAppContext;

  const validPayload = {
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

  beforeEach(async () => {
    context = await createTestApp();
  });

  afterEach(async () => {
    await context.app.close();
  });

  it('accepts a valid webhook payload', async () => {
    await requestApp(context)
      .post('/webhooks/orders')
      .send(validPayload)
      .expect(201)
      .expect({
        id: 'order-1',
        status: 'RECEIVED',
      });

    expect(
      context.mocks.webhooksService.createOrderFromWebhook,
    ).toHaveBeenCalledWith(validPayload);
  });

  it('rejects an invalid webhook payload before reaching the service', async () => {
    await requestApp(context)
      .post('/webhooks/orders')
      .send({
        ...validPayload,
        customer: {
          email: 'not-an-email',
          name: 'Ana',
        },
        items: [
          {
            sku: 'ABC123',
            qty: 0,
            unit_price: 59.9,
          },
        ],
      })
      .expect(400);

    expect(
      context.mocks.webhooksService.createOrderFromWebhook,
    ).not.toHaveBeenCalled();
  });

  it('keeps duplicate webhook requests idempotent at the HTTP boundary', async () => {
    await requestApp(context)
      .post('/webhooks/orders')
      .send(validPayload)
      .expect(201)
      .expect({
        id: 'order-1',
        status: 'RECEIVED',
      });

    await requestApp(context)
      .post('/webhooks/orders')
      .send(validPayload)
      .expect(201)
      .expect({
        id: 'order-1',
        status: 'RECEIVED',
      });
  });
});
