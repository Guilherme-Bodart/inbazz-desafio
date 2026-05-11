import './helpers/prisma.mock';
import {
  TestAppContext,
  createTestApp,
  requestApp,
} from './helpers/create-test-app';

describe('Orders flow (e2e)', () => {
  let context: TestAppContext;

  beforeEach(async () => {
    context = await createTestApp();
  });

  afterEach(async () => {
    await context.app.close();
  });

  it('lists orders with a status filter', async () => {
    await requestApp(context)
      .get('/orders')
      .query({ status: 'ENRICHED' })
      .expect(200)
      .expect([
        {
          id: 'order-1',
          status: 'ENRICHED',
        },
      ]);

    expect(context.mocks.ordersService.listOrders).toHaveBeenCalledWith(
      'ENRICHED',
    );
  });

  it('rejects an invalid order status filter', async () => {
    await requestApp(context)
      .get('/orders')
      .query({ status: 'INVALID' })
      .expect(400);

    expect(context.mocks.ordersService.listOrders).not.toHaveBeenCalled();
  });

  it('gets order details by id', async () => {
    await requestApp(context).get('/orders/order-1').expect(200).expect({
      id: 'order-1',
      status: 'ENRICHED',
      items: [],
    });

    expect(context.mocks.ordersService.getOrderById).toHaveBeenCalledWith(
      'order-1',
    );
  });
});
