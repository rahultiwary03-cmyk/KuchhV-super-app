import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsString,
  Max,
  Min,
} from 'class-validator';

export enum VehicleType {
  BIKE = 'BIKE',
  AUTO = 'AUTO',
  CAB = 'CAB',
}

export class OnboardPartnerDto {
  @IsEnum(VehicleType)
  vehicle_type!: VehicleType;

  @IsString()
  @IsNotEmpty()
  vehicle_number!: string;
}

export class UpdateLocationDto {
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude!: number;
}

export class ToggleOnlineDto {
  @IsBoolean()
  is_online!: boolean;
}
