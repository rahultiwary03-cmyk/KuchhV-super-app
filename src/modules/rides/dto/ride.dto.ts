import { Type } from 'class-transformer';
import {
  IsEnum,
  IsNumber,
  Max,
  Min,
  Matches,
  IsUUID,
} from 'class-validator';
import { RideVehicleType } from '../ride.entity';

export class BookRideDto {
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  pickup_latitude!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  pickup_longitude!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  drop_latitude!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  drop_longitude!: number;

  @IsEnum(RideVehicleType)
  vehicle_type!: RideVehicleType;
}

export class VerifyRideOtpDto {
  @IsUUID()
  challenge_id!: string;

  @Matches(/^[0-9]{4}$/)
  otp!: string;
}
