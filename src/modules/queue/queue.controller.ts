import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { QueueService } from './queue.service';

@ApiTags('queue')
@Controller('queue')
export class QueueController {
  constructor(private readonly queueService: QueueService) {}

  @Get('metrics')
  @ApiOperation({
    summary: 'Consulta metricas das filas',
  })
  @ApiOkResponse({
    description: 'Metricas atuais da fila de processamento e da DLQ.',
  })
  getMetrics() {
    return this.queueService.getMetrics();
  }
}
