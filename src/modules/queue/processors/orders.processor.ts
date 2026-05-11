import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Job } from 'bullmq';
import { OrdersService } from '../../orders/orders.service';
import { ORDERS_PROCESSING_QUEUE, PROCESS_ORDER_JOB } from '../queue.service';

type ProcessOrderJobData = {
  orderId: string;
};

@Injectable()
@Processor(ORDERS_PROCESSING_QUEUE)
export class OrdersProcessor extends WorkerHost {
  constructor(private readonly ordersService: OrdersService) {
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

    await this.ordersService.markAsEnriched(order.id, {
      enrichedAmount: order.totalAmount,
      enrichedCurrency: order.currency,
      enrichmentPayload: {
        provider: 'mock',
        processedAt: new Date().toISOString(),
      },
    });
  }
}
