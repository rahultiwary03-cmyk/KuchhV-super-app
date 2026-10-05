import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { OrderEntity } from '../orders/order.entity';
import { ProductEntity } from '../products/product.entity';
import { ShopEntity } from '../shops/shop.entity';
import { UserEntity } from '../users/user.entity';
import {
  WalletTransactionDirection,
  WalletTransactionType,
} from '../wallet/wallet-transaction.entity';
import { WalletService } from '../wallet/wallet.service';
import { AdBillingModel, AdCampaignEntity, AdCampaignStatus, AdPlacement } from './ad-campaign.entity';
import { AdEventEntity, AdEventType } from './ad-event.entity';
import { CreateAdCampaignDto } from './dto/ad.dto';

const ATTRIBUTION_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

@Injectable()
export class AdsService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(AdCampaignEntity)
    private readonly campaignRepo: Repository<AdCampaignEntity>,
    @InjectRepository(AdEventEntity)
    private readonly eventRepo: Repository<AdEventEntity>,
    private readonly walletService: WalletService,
  ) {}

  async createCampaign(ownerId: string, dto: CreateAdCampaignDto) {
    const startsAt = dto.starts_at ? new Date(dto.starts_at) : new Date();
    const endsAt = dto.ends_at ? new Date(dto.ends_at) : null;
    if (endsAt && endsAt <= startsAt) {
      throw new BadRequestException('Campaign end must be after its start');
    }

    return this.dataSource.transaction(async (manager) => {
      const shop = await manager
        .getRepository(ShopEntity)
        .findOne({ where: { id: dto.shop_id }, relations: { owner: true } });
      if (!shop) throw new NotFoundException('Shop not found');
      if (shop.owner_id !== ownerId) {
        throw new ForbiddenException('You do not own this shop');
      }
      if (shop.owner.status !== 'APPROVED' || !shop.is_active) {
        throw new ForbiddenException(
          'An approved vendor and active shop are required for advertising',
        );
      }

      if (dto.placement === AdPlacement.SPONSORED_LISTING) {
        if (!dto.product_id) {
          throw new BadRequestException(
            'Sponsored listings require a product',
          );
        }
        const product = await manager.getRepository(ProductEntity).findOne({
          where: { id: dto.product_id, shop_id: shop.id, is_available: true },
          select: { id: true },
        });
        if (!product) {
          throw new BadRequestException(
            'The advertised product must be available in your shop',
          );
        }
      }
      if (
        dto.placement === AdPlacement.BANNER &&
        !dto.banner_image_url
      ) {
        throw new BadRequestException('Banner campaigns require an image URL');
      }

      const campaigns = manager.getRepository(AdCampaignEntity);
      const campaign = await campaigns.save(
        campaigns.create({
          owner_user_id: ownerId,
          shop_id: shop.id,
          product_id: dto.product_id ?? null,
          name: dto.name.trim(),
          placement: dto.placement,
          billing_model: dto.billing_model,
          target_category: dto.target_category?.trim() || null,
          banner_image_url: dto.banner_image_url ?? null,
          banner_link_url: dto.banner_link_url ?? null,
          bid_amount: this.money(dto.bid_amount),
          budget_amount: this.money(dto.budget_amount),
          spent_amount: '0.00',
          status: AdCampaignStatus.ACTIVE,
          starts_at: startsAt,
          ends_at: endsAt,
        }),
      );

      await this.walletService.postTransaction(manager, {
        userId: ownerId,
        type: WalletTransactionType.AD_CAMPAIGN_FUNDING,
        direction: WalletTransactionDirection.DEBIT,
        amount: campaign.budget_amount,
        idempotencyKey: `ad-campaign-funding:${campaign.id}`,
        referenceId: campaign.id,
        description: `Reserved advertising budget for ${campaign.name}`,
      });
      return campaign;
    });
  }

  getCampaigns(ownerId: string) {
    return this.campaignRepo.find({
      where: { owner_user_id: ownerId },
      relations: { shop: true, product: true },
      order: { created_at: 'DESC' },
    });
  }

  async getAnalytics(ownerId: string, campaignId: string) {
    const campaign = await this.campaignRepo.findOne({
      where: { id: campaignId },
    });
    if (!campaign) throw new NotFoundException('Ad campaign not found');
    if (campaign.owner_user_id !== ownerId) {
      throw new ForbiddenException('You do not own this ad campaign');
    }

    const counts = await this.eventRepo
      .createQueryBuilder('event')
      .select(
        `COUNT(*) FILTER (WHERE event.event_type = 'IMPRESSION')`,
        'impressions',
      )
      .addSelect(
        `COUNT(*) FILTER (WHERE event.event_type = 'CLICK')`,
        'clicks',
      )
      .addSelect(
        `COUNT(*) FILTER (WHERE event.event_type = 'CONVERSION')`,
        'conversions',
      )
      .addSelect(
        `COALESCE(SUM(event.conversion_value) FILTER (WHERE event.event_type = 'CONVERSION'), 0)`,
        'conversion_value',
      )
      .where('event.campaign_id = :campaignId', { campaignId })
      .getRawOne<{
        impressions: string;
        clicks: string;
        conversions: string;
        conversion_value: string;
      }>();

    const impressions = Number(counts?.impressions ?? 0);
    const clicks = Number(counts?.clicks ?? 0);
    const conversions = Number(counts?.conversions ?? 0);
    const spend = Number(campaign.spent_amount);
    const conversionValue = Number(counts?.conversion_value ?? 0);
    return {
      campaign_id: campaign.id,
      billing_model: campaign.billing_model,
      impressions,
      clicks,
      conversions,
      click_through_rate_percent: this.ratio(clicks, impressions),
      conversion_rate_percent: this.ratio(conversions, clicks),
      spend: spend.toFixed(2),
      conversion_value: conversionValue.toFixed(2),
      return_on_ad_spend: spend > 0 ? Number((conversionValue / spend).toFixed(2)) : 0,
      currency: 'INR',
    };
  }

  async stopCampaign(ownerId: string, campaignId: string) {
    return this.dataSource.transaction(async (manager) => {
      const campaign = await manager
        .getRepository(AdCampaignEntity)
        .createQueryBuilder('campaign')
        .setLock('pessimistic_write')
        .where('campaign.id = :campaignId', { campaignId })
        .getOne();
      if (!campaign) throw new NotFoundException('Ad campaign not found');
      if (campaign.owner_user_id !== ownerId) {
        throw new ForbiddenException('You do not own this ad campaign');
      }
      if (campaign.status === AdCampaignStatus.STOPPED) return campaign;

      const unusedCents =
        this.toCents(campaign.budget_amount) -
        this.toCents(campaign.spent_amount);
      if (unusedCents > 0) {
        await this.walletService.postTransaction(manager, {
          userId: ownerId,
          type: WalletTransactionType.AD_CAMPAIGN_REFUND,
          direction: WalletTransactionDirection.CREDIT,
          amount: this.fromCents(unusedCents),
          idempotencyKey: `ad-campaign-refund:${campaign.id}`,
          referenceId: campaign.id,
          description: `Refunded unused advertising budget for ${campaign.name}`,
        });
      }
      campaign.status = AdCampaignStatus.STOPPED;
      return manager.getRepository(AdCampaignEntity).save(campaign);
    });
  }

  getSponsoredPlacements(
    query: {
      placement: AdPlacement;
      query?: string;
      category?: string;
      limit?: number;
    },
  ) {
    const now = new Date();
    const campaigns = this.campaignRepo
      .createQueryBuilder('campaign')
      .innerJoinAndSelect('campaign.shop', 'shop')
      .innerJoin('shop.owner', 'owner')
      .leftJoinAndSelect('campaign.product', 'product')
      .where('campaign.status = :status', {
        status: AdCampaignStatus.ACTIVE,
      })
      .andWhere('shop.is_active = true')
      .andWhere('owner.status = :ownerStatus', { ownerStatus: 'APPROVED' })
      .andWhere('campaign.placement = :placement', {
        placement: query.placement,
      })
      .andWhere('(campaign.starts_at IS NULL OR campaign.starts_at <= :now)', {
        now,
      })
      .andWhere('(campaign.ends_at IS NULL OR campaign.ends_at > :now)', {
        now,
      })
      .andWhere('CAST(campaign.spent_amount AS numeric) < CAST(campaign.budget_amount AS numeric)');
    if (query.placement === AdPlacement.SPONSORED_LISTING) {
      campaigns
        .andWhere('product.id IS NOT NULL')
        .andWhere('product.is_available = true');
    }

    if (query.category) {
      campaigns.andWhere(
        '(campaign.target_category ILIKE :category OR product.category ILIKE :category OR shop.category ILIKE :category)',
        { category: query.category },
      );
    }
    if (query.query?.trim()) {
      campaigns.andWhere(
        '(product.name ILIKE :search OR product.category ILIKE :search OR shop.name ILIKE :search OR campaign.target_category ILIKE :search)',
        { search: `%${query.query.trim()}%` },
      );
    }

    return campaigns
      .orderBy('campaign.bid_amount', 'DESC')
      .addOrderBy('campaign.created_at', 'ASC')
      .take(query.limit ?? 20)
      .getMany()
      .then((results) =>
        results.map((campaign) => ({
          campaign_id: campaign.id,
          placement: campaign.placement,
          label: 'Sponsored',
          billing_model: campaign.billing_model,
          target_category: campaign.target_category,
          shop: {
            id: campaign.shop.id,
            name: campaign.shop.name,
            category: campaign.shop.category,
          },
          product: campaign.product
            ? {
                id: campaign.product.id,
                name: campaign.product.name,
                category: campaign.product.category,
                price: campaign.product.price,
                image_url: campaign.product.image_url,
              }
            : null,
          banner_image_url: campaign.banner_image_url,
          banner_link_url: campaign.banner_link_url,
        })),
      );
  }

  recordImpression(userId: string, campaignId: string, eventId: string) {
    return this.recordEvent(
      userId,
      campaignId,
      eventId,
      AdEventType.IMPRESSION,
    );
  }

  recordClick(userId: string, campaignId: string, eventId: string) {
    return this.recordEvent(userId, campaignId, eventId, AdEventType.CLICK);
  }

  async attachClickToOrder(
    manager: EntityManager,
    clickId: string | undefined,
    customerId: string,
    shopId: string,
    orderId: string,
    orderAmount: string,
  ) {
    if (!clickId) return;
    const click = await manager
      .getRepository(AdEventEntity)
      .createQueryBuilder('event')
      .innerJoinAndSelect('event.campaign', 'campaign')
      .setLock('pessimistic_write')
      .where('event.id = :clickId', { clickId })
      .andWhere('event.event_type = :type', { type: AdEventType.CLICK })
      .andWhere('event.user_id = :customerId', { customerId })
      .getOne();
    if (
      !click ||
      click.campaign.shop_id !== shopId ||
      Date.now() - click.created_at.getTime() > ATTRIBUTION_WINDOW_MS
    ) {
      throw new BadRequestException(
        'Ad click is invalid, expired, or unrelated to this shop',
      );
    }
    const existingConversion = await manager
      .getRepository(AdEventEntity)
      .findOne({ where: { order_id: orderId } });
    if (existingConversion) return;
    const events = manager.getRepository(AdEventEntity);
    await events.save(
      events.create({
        campaign_id: click.campaign_id,
        user_id: customerId,
        event_type: AdEventType.CONVERSION,
        event_key: `conversion:${orderId}`,
        dedupe_key: `conversion:${orderId}`,
        order_id: orderId,
        charge_amount: '0.00',
        conversion_value: orderAmount,
      }),
    );
  }

  private recordEvent(
    userId: string,
    campaignId: string,
    eventId: string,
    eventType: AdEventType.IMPRESSION | AdEventType.CLICK,
  ) {
    return this.dataSource.transaction(async (manager) => {
      const campaigns = manager.getRepository(AdCampaignEntity);
      const campaign = await campaigns
        .createQueryBuilder('campaign')
        .setLock('pessimistic_write')
        .where('campaign.id = :campaignId', { campaignId })
        .getOne();
      if (!campaign) throw new NotFoundException('Ad campaign not found');

      const user = await manager.getRepository(UserEntity).findOne({
        where: { id: userId },
        select: { id: true, role: true },
      });
      if (!user || user.role !== 'CUSTOMER') {
        throw new ForbiddenException('Only customers can interact with ads');
      }
      if (campaign.owner_user_id === userId) {
        throw new ForbiddenException('Vendors cannot interact with their own ads');
      }

      const now = new Date();
      const day = now.toISOString().slice(0, 10);
      const dedupeKey = `${campaignId}:${userId}:${eventType}:${day}`;
      const eventKey = `${campaignId}:${eventType}:${eventId}`;
      const events = manager.getRepository(AdEventEntity);
      const prior = await events.findOne({
        where: [{ dedupe_key: dedupeKey }, { event_key: eventKey }],
      });
      if (prior) {
        return {
          accepted: true,
          event_id: prior.id,
          charged: prior.charge_amount,
          currency: 'INR',
          deduplicated: true,
        };
      }
      if (campaign.status !== AdCampaignStatus.ACTIVE) {
        throw new ConflictException('Ad campaign is not active');
      }
      if (
        (campaign.starts_at && campaign.starts_at > now) ||
        (campaign.ends_at && campaign.ends_at <= now)
      ) {
        throw new ConflictException('Ad campaign is outside its active dates');
      }
      const budgetCents = this.toCents(campaign.budget_amount);
      const spentCents = this.toCents(campaign.spent_amount);
      if (spentCents >= budgetCents) {
        campaign.status = AdCampaignStatus.EXHAUSTED;
        await campaigns.save(campaign);
        return { accepted: false, reason: 'Campaign budget is exhausted' };
      }

      if (eventType === AdEventType.CLICK) {
        const recentImpression = await events.findOne({
          where: {
            campaign_id: campaign.id,
            user_id: userId,
            event_type: AdEventType.IMPRESSION,
          },
          order: { created_at: 'DESC' },
        });
        if (
          !recentImpression ||
          now.getTime() - recentImpression.created_at.getTime() >
            24 * 60 * 60 * 1000
        ) {
          throw new BadRequestException(
            'Record a visible ad impression before recording its click',
          );
        }
      }

      let chargeCents = 0;
      if (
        (eventType === AdEventType.CLICK &&
          campaign.billing_model === AdBillingModel.CPC) ||
        (eventType === AdEventType.IMPRESSION &&
          campaign.billing_model === AdBillingModel.CPM)
      ) {
        if (campaign.billing_model === AdBillingModel.CPC) {
          chargeCents = this.toCents(campaign.bid_amount);
        } else {
          const impressionCount = await events.count({
            where: {
              campaign_id: campaign.id,
              event_type: AdEventType.IMPRESSION,
            },
          });
          const priorCumulativeCents = Math.round(
            (impressionCount * this.toCents(campaign.bid_amount)) / 1000,
          );
          const nextCumulativeCents = Math.round(
            ((impressionCount + 1) * this.toCents(campaign.bid_amount)) /
              1000,
          );
          chargeCents = nextCumulativeCents - priorCumulativeCents;
        }
        chargeCents = Math.min(chargeCents, budgetCents - spentCents);
      }

      const event = await events.save(
        events.create({
          campaign_id: campaign.id,
          user_id: userId,
          event_type: eventType,
          event_key: eventKey,
          dedupe_key: dedupeKey,
          order_id: null,
          charge_amount: this.fromCents(chargeCents),
          conversion_value: '0.00',
        }),
      );
      if (chargeCents > 0) {
        campaign.spent_amount = this.fromCents(spentCents + chargeCents);
        if (spentCents + chargeCents >= budgetCents) {
          campaign.status = AdCampaignStatus.EXHAUSTED;
        }
        await campaigns.save(campaign);
      }
      return {
        accepted: true,
        event_id: event.id,
        charged: event.charge_amount,
        currency: 'INR',
        deduplicated: false,
      };
    });
  }

  private ratio(numerator: number, denominator: number) {
    return denominator > 0
      ? Number(((numerator / denominator) * 100).toFixed(2))
      : 0;
  }

  private money(value: number) {
    return this.fromCents(this.toCents(value));
  }

  private toCents(value: number | string) {
    const amount = Number(value);
    if (!Number.isFinite(amount) || amount < 0) {
      throw new BadRequestException('Invalid advertising amount');
    }
    const cents = Math.round(amount * 100);
    if (!Number.isSafeInteger(cents)) {
      throw new BadRequestException('Advertising amount is out of range');
    }
    return cents;
  }

  private fromCents(cents: number) {
    return (cents / 100).toFixed(2);
  }
}
