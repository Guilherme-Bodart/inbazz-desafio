import { Body, Controller, Post } from '@nestjs/common';
import { ApiCreatedResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { WebhooksService } from './webhooks.service';
import { CreateWebhookOrderDto } from './dto/create-webhook-order.dto';

@ApiTags('webhooks')
@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Post('orders')
  @ApiOperation({
    summary: 'Recebe pedidos externos via webhook',
  })
  @ApiCreatedResponse({
    description: 'Pedido validado e persistido com status inicial RECEIVED.',
  })
  createOrder(@Body() dto: CreateWebhookOrderDto) {
    return this.webhooksService.createOrderFromWebhook(dto);
  }
}
