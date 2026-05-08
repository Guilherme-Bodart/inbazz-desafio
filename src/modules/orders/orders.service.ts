import { Injectable, NotFoundException } from '@nestjs/common';
import { OrderStatus } from '../../../generated/prisma/client';
import type { Prisma } from '../../../generated/prisma/client';
import { OrdersRepository } from './orders.repository';

type EnrichmentData = {
  enrichedAmount: Prisma.Decimal | Prisma.DecimalJsLike | number | string;
  enrichedCurrency: string;
  enrichmentPayload: Prisma.InputJsonValue;
};

@Injectable()
export class OrdersService {
  constructor(private readonly ordersRepository: OrdersRepository) {}

  createOrder(data: Prisma.OrderCreateInput) {
    return this.ordersRepository.create(data);
  }

  listOrders(status?: OrderStatus) {
    return this.ordersRepository.findAll(status);
  }

  findById(id: string) {
    return this.ordersRepository.findById(id);
  }

  async getOrderById(id: string) {
    const order = await this.ordersRepository.findById(id);

    if (!order) {
      throw new NotFoundException(`Order with id "${id}" not found.`);
    }

    return order;
  }

  findByIdempotencyKey(idempotencyKey: string) {
    return this.ordersRepository.findByIdempotencyKey(idempotencyKey);
  }

  markAsReceived(orderId: string) {
    return this.ordersRepository.updateStatus(orderId, OrderStatus.RECEIVED);
  }

  markAsProcessing(orderId: string) {
    return this.ordersRepository.updateStatus(orderId, OrderStatus.PROCESSING);
  }

  markAsEnriched(orderId: string, enrichmentData: EnrichmentData) {
    return this.ordersRepository.saveEnrichment(orderId, enrichmentData);
  }

  markAsFailedEnrichment(orderId: string, failureReason: string) {
    return this.ordersRepository.markFailedEnrichment(orderId, failureReason);
  }
}
