import {
  ORDER_PROCESSING_ATTEMPTS,
  ORDER_PROCESSING_BACKOFF_DELAY,
  ORDERS_PROCESSING_QUEUE,
  PROCESS_ORDER_JOB,
  QueueService,
} from './queue.service';

describe('QueueService', () => {
  it('enqueues an order processing job using the order id as job id', async () => {
    const ordersQueue = {
      add: jest.fn().mockResolvedValue({ id: 'order-1' }),
    };
    const service = new QueueService(ordersQueue as never);

    await service.enqueueOrderProcessing('order-1');

    expect(ordersQueue.add).toHaveBeenCalledWith(
      PROCESS_ORDER_JOB,
      { orderId: 'order-1' },
      {
        attempts: ORDER_PROCESSING_ATTEMPTS,
        backoff: {
          type: 'exponential',
          delay: ORDER_PROCESSING_BACKOFF_DELAY,
        },
        jobId: 'order-1',
      },
    );
  });

  it('keeps the expected queue name stable', () => {
    expect(ORDERS_PROCESSING_QUEUE).toBe('orders-processing');
  });
});
