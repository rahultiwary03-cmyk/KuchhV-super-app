import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsNumber,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  IsBoolean,
  Min,
  ValidateNested,
} from 'class-validator';

export class OrderItemDto {
  @IsUUID()
  product_id!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity!: number;
}

export class CreateOrderDto {
  @IsUUID()
  shop_id!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items!: OrderItemDto[];

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  total_amount?: number;

  @IsString()
  @IsNotEmpty()
  delivery_address!: string;

  @IsUUID()
  @IsOptional()
  ad_click_id?: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  coins_to_redeem?: number;

  @IsBoolean()
  @IsOptional()
  use_vip_deal?: boolean;
}
