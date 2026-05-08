import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsString,
  ValidateNested,
} from 'class-validator';
import { CustomerDto } from './customer.dto';
import { OrderItemDto } from './order-item.dto';

export class CreateWebhookOrderDto {
  @ApiProperty({
    example: 'ext-123',
  })
  @IsString()
  order_id!: string;

  @ApiProperty({
    type: CustomerDto,
  })
  @ValidateNested()
  @Type(() => CustomerDto)
  customer!: CustomerDto;

  @ApiProperty({
    type: [OrderItemDto],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items!: OrderItemDto[];

  @ApiProperty({
    example: 'USD',
  })
  @IsString()
  currency!: string;

  @ApiProperty({
    example: 'uuid-or-hash',
  })
  @IsString()
  idempotency_key!: string;
}
