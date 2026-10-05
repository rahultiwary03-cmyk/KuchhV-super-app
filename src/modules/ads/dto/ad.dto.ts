import { Type } from 'class-transformer';
import {
  IsEnum,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  IsUrl,
  Length,
  Matches,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';
import { AdBillingModel, AdPlacement } from '../ad-campaign.entity';

export class CreateAdCampaignDto {
  @IsUUID()
  shop_id!: string;

  @IsString()
  @Length(1, 120)
  name!: string;

  @IsEnum(AdPlacement)
  placement!: AdPlacement;

  @IsEnum(AdBillingModel)
  billing_model!: AdBillingModel;

  @ValidateIf((dto: CreateAdCampaignDto) =>
    dto.placement === AdPlacement.SPONSORED_LISTING,
  )
  @IsUUID()
  product_id?: string;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  target_category?: string;

  @ValidateIf((dto: CreateAdCampaignDto) => dto.placement === AdPlacement.BANNER)
  @IsUrl({ protocols: ['https'], require_protocol: true })
  banner_image_url?: string;

  @IsOptional()
  @IsUrl({ protocols: ['https'], require_protocol: true })
  banner_link_url?: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(100000)
  bid_amount!: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(10)
  @Max(1000000)
  budget_amount!: number;

  @IsOptional()
  @IsISO8601()
  starts_at?: string;

  @IsOptional()
  @IsISO8601()
  ends_at?: string;
}

export class AdEventDto {
  @IsString()
  @Matches(/^[a-zA-Z0-9_-]{8,80}$/)
  event_id!: string;
}

export class SponsoredPlacementQueryDto {
  @IsEnum(AdPlacement)
  placement!: AdPlacement;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  query?: string;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  category?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(50)
  limit?: number;
}
