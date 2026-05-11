import { Injectable } from '@nestjs/common';
import { OrderStatus, Prisma } from '../../../generated/prisma/client';
import { OrdersService } from '../orders/orders.service';
import { QueueService } from '../queue/queue.service';
import { CreateWebhookOrderDto } from './dto/create-webhook-order.dto';

@Injectable()
export class WebhooksService {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly queueService: QueueService,
  ) {}

  calculateOrderTotal(items: CreateWebhookOrderDto['items']) {
    return items.reduce((total, item) => total + item.qty * item.unit_price, 0);
  }

  async createOrderFromWebhook(dto: CreateWebhookOrderDto) {
    const existingOrder = await this.ordersService.findByIdempotencyKey(
      dto.idempotency_key,
    );

    if (existingOrder) {
      return this.buildWebhookResponse(existingOrder);
    }

    try {
      const totalAmount = this.calculateOrderTotal(dto.items);

      const order = await this.ordersService.createOrder({
        externalOrderId: dto.order_id,
        idempotencyKey: dto.idempotency_key,
        customerEmail: dto.customer.email,
        customerName: dto.customer.name,
        currency: dto.currency,
        totalAmount,
        status: OrderStatus.RECEIVED,
        items: {
          create: dto.items.map((item) => ({
            sku: item.sku,
            qty: item.qty,
            unitPrice: item.unit_price,
          })),
        },
      });

      await this.queueService.enqueueOrderProcessing(order.id);

      return this.buildWebhookResponse(order);
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        const order = await this.ordersService.findByIdempotencyKey(
          dto.idempotency_key,
        );

        if (order) {
          return this.buildWebhookResponse(order);
        }
      }

      throw error;
    }
  }

  private isUniqueConstraintError(
    error: unknown,
  ): error is Prisma.PrismaClientKnownRequestError {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    );
  }

  private buildWebhookResponse(order: { id: string; status: OrderStatus }) {
    return {
      id: order.id,
      status: order.status,
    };
  }
}
