import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { OrdersModule } from './modules/orders/orders.module';
import { WebhooksModule } from './modules/webhooks/webhooks.module';
import { PrismaModule } from './prisma/prisma.module';


@Module({
  imports: [ConfigModule.forRoot(
    { isGlobal: true }
  ), PrismaModule, OrdersModule, WebhooksModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
