import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';

export const ORDERS_PROCESSING_QUEUE = 'orders-processing';
export const PROCESS_ORDER_JOB = 'process-order';

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
        jobId: orderId,
      },
    );
  }
}
