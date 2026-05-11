import { Controller, Get, Param, Query } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { ListOrdersQueryDto } from './dto/list-orders-query.dto';
import { OrdersService } from './orders.service';

@ApiTags('orders')
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  @ApiOperation({
    summary: 'Lista pedidos',
  })
  @ApiOkResponse({
    description: 'Lista de pedidos encontrados.',
  })
  listOrders(@Query() query: ListOrdersQueryDto) {
    return this.ordersService.listOrders(query.status);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Busca um pedido pelo id',
  })
  @ApiParam({
    name: 'id',
    example: 'clw0000000000abcd1234efgh',
  })
  @ApiOkResponse({
    description: 'Detalhes do pedido encontrado.',
  })
  getOrderById(@Param('id') id: string) {
    return this.ordersService.getOrderById(id);
  }
}
