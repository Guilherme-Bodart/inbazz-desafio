import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { OrdersModule } from '../orders/orders.module';
import { OrdersProcessor } from './processors/orders.processor';
import { ORDERS_PROCESSING_QUEUE, QueueService } from './queue.service';

@Module({
  imports: [
    OrdersModule,
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get<string>('REDIS_HOST', 'localhost'),
          port: Number(configService.get<string>('REDIS_PORT', '6379')),
        },
      }),
    }),
    BullModule.registerQueue({
      name: ORDERS_PROCESSING_QUEUE,
    }),
  ],
  providers: [QueueService, OrdersProcessor],
  exports: [QueueService],
})
export class QueueModule {}
