import {
  InjectQueue,
  OnWorkerEvent,
  Processor,
  WorkerHost,
} from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Job, Queue } from 'bullmq';
import { EnrichmentService } from '../../enrichment/enrichment.service';
import { OrdersService } from '../../orders/orders.service';
import {
  ORDERS_DLQ_QUEUE,
  ORDERS_PROCESSING_QUEUE,
  PROCESS_ORDER_JOB,
} from '../queue.service';

type ProcessOrderJobData = {
  orderId: string;
};

@Injectable()
@Processor(ORDERS_PROCESSING_QUEUE)
export class OrdersProcessor extends WorkerHost {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly enrichmentService: EnrichmentService,
    @InjectQueue(ORDERS_DLQ_QUEUE)
    private readonly ordersDlq: Queue,
  ) {
    super();
  }

  async process(job: Job<ProcessOrderJobData>) {
    if (job.name !== PROCESS_ORDER_JOB) {
      return;
    }

    await this.processOrder(job.data.orderId);
  }

  async processOrder(orderId: string) {
    const order = await this.ordersService.getOrderById(orderId);

    await this.ordersService.markAsProcessing(order.id);

    const enrichmentData = await this.enrichmentService.convertOrderTotal(
      order.totalAmount,
      order.currency,
    );

    await this.ordersService.markAsEnriched(order.id, enrichmentData);
  }

  @OnWorkerEvent('failed')
  async onFailed(job: Job<ProcessOrderJobData> | undefined, error: Error) {
    if (
      !job ||
      job.name !== PROCESS_ORDER_JOB ||
      !this.hasExhaustedAttempts(job)
    ) {
      return;
    }

    const failureReason = error.message || job.failedReason;

    await this.ordersService.markAsFailedEnrichment(
      job.data.orderId,
      failureReason,
    );

    await this.ordersDlq.add(
      'failed-order',
      {
        orderId: job.data.orderId,
        failedReason: failureReason,
        attemptsMade: job.attemptsMade,
      },
      {
        jobId: job.data.orderId,
      },
    );
  }

  private hasExhaustedAttempts(job: Job<ProcessOrderJobData>) {
    const maxAttempts = Number(job.opts.attempts ?? 1);

    return job.attemptsMade >= maxAttempts;
  }
}
