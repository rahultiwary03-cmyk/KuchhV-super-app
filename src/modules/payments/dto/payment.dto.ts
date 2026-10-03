import { Type } from 'class-transformer';
import { IsNumber, IsNotEmpty, IsUUID, Min } from 'class-validator';

export class CreateRazorpayOrderDto {
  @IsUUID()
  order_id!: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @IsNotEmpty()
  amount!: number;
}
