import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';

export const ORDERS_PROCESSING_QUEUE = 'orders-processing';
export const ORDERS_DLQ_QUEUE = 'orders-dlq';
export const PROCESS_ORDER_JOB = 'process-order';
export const ORDER_PROCESSING_ATTEMPTS = 3;
export const ORDER_PROCESSING_BACKOFF_DELAY = 2000;

@Injectable()
export class QueueService {
  constructor(
    @InjectQueue(ORDERS_PROCESSING_QUEUE)
    private readonly ordersQueue: Queue,
    @InjectQueue(ORDERS_DLQ_QUEUE)
    private readonly ordersDlq: Queue,
  ) {}

  enqueueOrderProcessing(orderId: string) {
    return this.ordersQueue.add(
      PROCESS_ORDER_JOB,
      { orderId },
      {
        attempts: ORDER_PROCESSING_ATTEMPTS,
        backoff: {
          type: 'exponential',
          delay: ORDER_PROCESSING_BACKOFF_DELAY,
        },
        jobId: orderId,
      },
    );
  }

  async getMetrics() {
    const [ordersCounts, dlqCounts] = await Promise.all([
      this.ordersQueue.getJobCounts(
        'waiting',
        'active',
        'completed',
        'failed',
        'delayed',
      ),
      this.ordersDlq.getJobCounts('waiting', 'active', 'completed', 'failed'),
    ]);

    return {
      waiting: ordersCounts.waiting,
      active: ordersCounts.active,
      completed: ordersCounts.completed,
      failed: ordersCounts.failed,
      delayed: ordersCounts.delayed,
      dlq: {
        waiting: dlqCounts.waiting,
        active: dlqCounts.active,
        completed: dlqCounts.completed,
        failed: dlqCounts.failed,
      },
    };
  }
}
