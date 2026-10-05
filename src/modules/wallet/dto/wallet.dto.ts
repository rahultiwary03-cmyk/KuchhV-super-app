import { Type } from 'class-transformer';
import {
  IsEmail,
  IsNumber,
  IsString,
  Matches,
  Max,
  Min,
  MinLength,
} from 'class-validator';

export class RechargeWalletDto {
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(50)
  @Max(50000)
  amount!: number;
}

export class SetPayoutProfileDto {
  @IsString()
  @Matches(/^[a-zA-Z0-9.-]{2,64}@[a-zA-Z0-9.-]{2,32}$/)
  vpa!: string;
}
