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
}
