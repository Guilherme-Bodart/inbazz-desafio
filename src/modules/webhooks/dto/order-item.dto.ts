import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsPositive, IsString, Min } from 'class-validator';

export class OrderItemDto {
  @ApiProperty({
    example: 'ABC123',
  })
  @IsString()
  sku!: string;

  @ApiProperty({
    example: 2,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  qty!: number;

  @ApiProperty({
    example: 59.9,
  })
  @Type(() => Number)
  @IsPositive()
  unit_price!: number;
}
