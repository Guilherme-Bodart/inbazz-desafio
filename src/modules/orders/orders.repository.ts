import { Injectable } from '@nestjs/common';
import type {
  Order,
  OrderStatus,
  Prisma,
} from '../../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

const orderWithItemsInclude = {
  items: true,
} satisfies Prisma.OrderInclude;

type OrderWithItems = Prisma.OrderGetPayload<{
  include: typeof orderWithItemsInclude;
}>;

type EnrichmentData = {
  enrichedAmount: Prisma.Decimal | Prisma.DecimalJsLike | number | string;
  enrichedCurrency: string;
  enrichmentPayload: Prisma.InputJsonValue;
};

@Injectable()
export class OrdersRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: Prisma.OrderCreateInput): Promise<OrderWithItems> {
    return this.prisma.order.create({
      data,
      include: orderWithItemsInclude,
    });
  }

  findAll(status?: OrderStatus): Promise<OrderWithItems[]> {
    return this.prisma.order.findMany({
      where: status ? { status } : undefined,
      include: orderWithItemsInclude,
      orderBy: { createdAt: 'desc' },
    });
  }

  findById(id: string): Promise<OrderWithItems | null> {
    return this.prisma.order.findUnique({
      where: { id },
      include: orderWithItemsInclude,
    });
  }

  findByIdempotencyKey(idempotencyKey: string): Promise<OrderWithItems | null> {
    return this.prisma.order.findUnique({
      where: { idempotencyKey },
      include: orderWithItemsInclude,
    });
  }

  updateStatus(orderId: string, status: OrderStatus): Promise<Order> {
    return this.prisma.order.update({
      where: { id: orderId },
      data: { status },
    });
  }

  saveEnrichment(orderId: string, data: EnrichmentData): Promise<Order> {
    return this.prisma.order.update({
      where: { id: orderId },
      data: {
        enrichedAmount: data.enrichedAmount,
        enrichedCurrency: data.enrichedCurrency,
        enrichmentPayload: data.enrichmentPayload,
        status: 'ENRICHED',
        failureReason: null,
      },
    });
  }

  markFailedEnrichment(orderId: string, failureReason: string): Promise<Order> {
    return this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'FAILED_ENRICHMENT',
        failureReason,
      },
    });
  }
}
