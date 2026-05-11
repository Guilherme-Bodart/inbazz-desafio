import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { OrderStatus } from '../../../../generated/prisma/client';

export class ListOrdersQueryDto {
  @ApiPropertyOptional({
    enum: OrderStatus,
    example: OrderStatus.ENRICHED,
  })
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;
}
