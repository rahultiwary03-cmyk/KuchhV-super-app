import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

type ShopCommissionBand =
  | 'GROCERIES'
  | 'RESTAURANTS'
  | 'PHARMACIES'
  | 'HOME_SERVICES'
  | 'DEFAULT';

const DEFAULT_RATES: Record<ShopCommissionBand, number> = {
  GROCERIES: 6,
  RESTAURANTS: 11,
  PHARMACIES: 5,
  HOME_SERVICES: 10,
  DEFAULT: 10,
};

const CATEGORY_ALIASES: Record<Exclude<ShopCommissionBand, 'DEFAULT'>, string[]> = {
  GROCERIES: [
    'grocery',
    'groceries',
    'daily essentials',
    'grocery daily essentials',
    'groceries daily essentials',
    'kirana',
  ],
  RESTAURANTS: [
    'restaurant',
    'restaurants',
    'food',
    'fast food',
    'restaurant fast food',
    'restaurants fast food',
    'cafe',
    'cafe restaurant',
  ],
  PHARMACIES: [
    'pharmacy',
    'pharmacies',
    'medicine',
    'medicines',
    'pharmacies medicines',
    'medical store',
  ],
  HOME_SERVICES: [
    'home service',
    'home services',
    'repair',
    'repairs',
    'home services repairs',
  ],
};

export function getShopCommissionPercentage(
  category: string,
  configService: ConfigService,
): number {
  const normalizedCategory = category
    .toLowerCase()
    .replace(/&/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');

  const band = (
    Object.entries(CATEGORY_ALIASES).find(([, aliases]) =>
      aliases.includes(normalizedCategory),
    )?.[0] ?? 'DEFAULT'
  ) as ShopCommissionBand;
  const configured = configService.get<string>(
    `SHOP_COMMISSION_${band}_PERCENT`,
  );
  const percentage =
    configured === undefined ? DEFAULT_RATES[band] : Number(configured);

  if (!Number.isFinite(percentage) || percentage < 0 || percentage > 100) {
    throw new BadRequestException(
      `SHOP_COMMISSION_${band}_PERCENT must be between 0 and 100`,
    );
  }
  return percentage;
}
