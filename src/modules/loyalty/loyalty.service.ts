import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomInt, randomUUID } from 'crypto';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { OrderEntity } from '../orders/order.entity';
import { PaymentEntity } from '../payments/payment.entity';
import { RideEntity, RideStatus } from '../rides/ride.entity';
import { UserEntity } from '../users/user.entity';
import { WalletService } from '../wallet/wallet.service';
import {
  WalletTransactionDirection,
  WalletTransactionEntity,
  WalletTransactionType,
} from '../wallet/wallet-transaction.entity';
import { LoyaltyAccountEntity } from './loyalty-account.entity';
import { LoyaltyBadgeEntity } from './loyalty-badge.entity';
import { LoyaltyTransactionEntity, LoyaltyTransactionType } from './loyalty-transaction.entity';
import { ScratchCardEntity } from './scratch-card.entity';
import { VipMembershipEntity } from './vip-membership.entity';

const PASS_PRICE_CENTS = 9900;
const PASS_DAYS = 30;
const VIP_MINIMUM_DELIVERY_CENTS = 19900;
const DELIVERY_FEE_CENTS = 3000;
const VIP_DEAL_MINIMUM_CENTS = 29900;
const VIP_DEAL_MAX_CENTS = 5000;
const VIP_DEAL_BASIS_POINTS = 500;
const COIN_REDEMPTION_BASIS_POINTS = 2000;

const MILESTONE_BADGES = [
  { key: 'FIRST_ORDER', metric: 'orders', threshold: 1, name: 'First Order', description: 'Completed your first order.', icon: 'shopping_bag' },
  { key: 'TEN_ORDERS', metric: 'orders', threshold: 10, name: 'Local Regular', description: 'Completed 10 orders.', icon: 'local_cafe' },
  { key: 'FIFTY_ORDERS', metric: 'orders', threshold: 50, name: 'KuchhV Legend', description: 'Completed 50 orders.', icon: 'workspace_premium' },
  { key: 'FIRST_RIDE', metric: 'rides', threshold: 1, name: 'First Ride', description: 'Completed your first ride.', icon: 'directions_bike' },
  { key: 'TEN_RIDES', metric: 'rides', threshold: 10, name: 'Ride Explorer', description: 'Completed 10 rides.', icon: 'explore' },
  { key: 'FIFTY_RIDES', metric: 'rides', threshold: 50, name: 'Road Legend', description: 'Completed 50 rides.', icon: 'emoji_events' },
];

@Injectable()
export class LoyaltyService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(LoyaltyAccountEntity)
    private readonly accountRepo: Repository<LoyaltyAccountEntity>,
    @InjectRepository(VipMembershipEntity)
    private readonly membershipRepo: Repository<VipMembershipEntity>,
    @InjectRepository(ScratchCardEntity)
    private readonly scratchRepo: Repository<ScratchCardEntity>,
    @InjectRepository(LoyaltyBadgeEntity)
    private readonly badgeRepo: Repository<LoyaltyBadgeEntity>,
    @InjectRepository(LoyaltyTransactionEntity)
    private readonly transactionRepo: Repository<LoyaltyTransactionEntity>,
    private readonly walletService: WalletService,
  ) {}

  async getOverview(userId: string) {
    return this.accountRepo.manager.transaction(async (manager) => {
      const account = await this.getOrCreateAccount(manager, userId);
      const membership = await manager.getRepository(VipMembershipEntity).findOne({
        where: { user_id: userId },
      });
      const now = new Date();
      return {
        coins: account.coins_balance,
        coin_value_inr: account.coins_balance,
        vip: {
          active: !!membership && membership.status === 'ACTIVE' && membership.expires_at > now,
          starts_at: membership?.starts_at ?? null,
          expires_at: membership?.expires_at ?? null,
          monthly_price_inr: 99,
          auto_renew: false,
          exclusive_deal: '5% off orders of INR 299 or more, capped at INR 50 once per calendar month',
        },
        scratch_cards_available: await manager
          .getRepository(ScratchCardEntity)
          .count({ where: { user_id: userId, status: 'AVAILABLE' } }),
        badges: await manager.getRepository(LoyaltyBadgeEntity).find({
          where: { user_id: userId },
          order: { earned_at: 'DESC' },
        }),
      };
    });
  }

  getTransactions(userId: string) {
    return this.transactionRepo.find({
      where: { user_id: userId },
      order: { created_at: 'DESC' },
      take: 100,
    });
  }

  async subscribeVip(userId: string) {
    return this.dataSource.transaction(async (manager) => {
      const users = manager.getRepository(UserEntity);
      const user = await users.findOne({
        where: { id: userId },
        select: { id: true, role: true },
      });
      if (!user || user.role !== 'CUSTOMER') {
        throw new ForbiddenException('VIP Pass is available to customers');
      }
      const memberships = manager.getRepository(VipMembershipEntity);
      let membership = await memberships
        .createQueryBuilder('membership')
        .setLock('pessimistic_write')
        .where('membership.user_id = :userId', { userId })
        .getOne();
      const now = new Date();
      const startsAt =
        membership?.status === 'ACTIVE' && membership.expires_at > now
          ? membership.expires_at
          : now;
      const expiresAt = new Date(startsAt);
      expiresAt.setUTCDate(expiresAt.getUTCDate() + PASS_DAYS);

      await this.walletService.postTransaction(manager, {
        userId,
        type: WalletTransactionType.VIP_SUBSCRIPTION,
        direction: WalletTransactionDirection.DEBIT,
        amount: this.walletService.fromCents(PASS_PRICE_CENTS),
        idempotencyKey: `vip-subscription:${randomUUID()}`,
        description: 'KuchhV VIP Pass monthly membership',
      });
      membership = memberships.create({
        ...membership,
        user_id: userId,
        starts_at: startsAt,
        expires_at: expiresAt,
        status: 'ACTIVE',
        subscription_count: (membership?.subscription_count ?? 0) + 1,
      });
      const saved = await memberships.save(membership);
      await this.grantBadge(manager, userId, 'VIP_MEMBER');
      return {
        success: true,
        membership: saved,
        charged: '99.00',
        currency: 'INR',
        auto_renew: false,
      };
    });
  }

  async getScratchCards(userId: string) {
    const cards = await this.scratchRepo.find({
      where: { user_id: userId },
      order: { created_at: 'DESC' },
      take: 100,
    });
    return cards.map((card) => ({
      ...card,
      reward_coins: card.status === 'SCRATCHED' ? card.reward_coins : null,
    }));
  }

  async scratchCard(userId: string, cardId: string) {
    return this.dataSource.transaction(async (manager) => {
      const cards = manager.getRepository(ScratchCardEntity);
      const card = await cards
        .createQueryBuilder('card')
        .setLock('pessimistic_write')
        .where('card.id = :cardId', { cardId })
        .getOne();
      if (!card) throw new NotFoundException('Scratch card not found');
      if (card.user_id !== userId) {
        throw new ForbiddenException('This scratch card belongs to another user');
      }
      if (card.status !== 'AVAILABLE') {
        throw new ConflictException('Scratch card has already been used');
      }
      card.status = 'SCRATCHED';
      card.scratched_at = new Date();
      await cards.save(card);
      const account = await this.creditCoins(
        manager,
        userId,
        card.reward_coins,
        LoyaltyTransactionType.SCRATCH_CARD_REWARD,
        `scratch-card:${card.id}`,
        card.id,
        `KuchhV scratch-card reward (${card.id})`,
      );
      return {
        success: true,
        card_id: card.id,
        coins_awarded: card.reward_coins,
        balance: account.coins_balance,
      };
    });
  }

  async getCheckoutBenefits(
    manager: EntityManager,
    userId: string,
    itemSubtotalCents: number,
    requestedCoins: number,
    useVipDeal: boolean,
  ) {
    const now = new Date();
    const membership = await manager
      .getRepository(VipMembershipEntity)
      .createQueryBuilder('membership')
      .setLock('pessimistic_write')
      .where('membership.user_id = :userId', { userId })
      .getOne();
    const vipActive =
      !!membership &&
      membership.status === 'ACTIVE' &&
      membership.expires_at > now;
    const deliveryFeeCents =
      vipActive && itemSubtotalCents >= VIP_MINIMUM_DELIVERY_CENTS
        ? 0
        : DELIVERY_FEE_CENTS;

    let vipDealCents = 0;
    if (useVipDeal) {
      if (!vipActive || !membership) {
        throw new BadRequestException('An active VIP Pass is required for this deal');
      }
      if (itemSubtotalCents < VIP_DEAL_MINIMUM_CENTS) {
        throw new BadRequestException('VIP deal requires an order of at least INR 299');
      }
      const currentMonth = this.currentMonth();
      if (membership.deal_used_month === currentMonth) {
        throw new ConflictException('This month’s VIP deal has already been used');
      }
      vipDealCents = Math.min(
        VIP_DEAL_MAX_CENTS,
        Math.floor((itemSubtotalCents * VIP_DEAL_BASIS_POINTS) / 10000),
      );
      membership.deal_used_month = currentMonth;
      await manager.getRepository(VipMembershipEntity).save(membership);
    }

    let coinDiscountCents = 0;
    if (!Number.isInteger(requestedCoins) || requestedCoins < 0) {
      throw new BadRequestException('coins_to_redeem must be a non-negative integer');
    }
    if (requestedCoins > 0) {
      const maxCoins = Math.floor(
        (itemSubtotalCents * COIN_REDEMPTION_BASIS_POINTS) / 10000,
      );
      if (requestedCoins > maxCoins) {
        throw new BadRequestException(
          `You can redeem up to ${maxCoins} coins on this order`,
        );
      }
      const account = await this.getOrCreateAccount(manager, userId, true);
      if (account.coins_balance < requestedCoins) {
        throw new ConflictException('Insufficient KuchhV Coins');
      }
      coinDiscountCents = requestedCoins * 100;
    }

    return {
      vipActive,
      vipFreeDelivery: deliveryFeeCents === 0,
      deliveryFeeCents,
      vipDealCents,
      requestedCoins,
      coinDiscountCents,
    };
  }

  async reserveOrderCoins(
    manager: EntityManager,
    userId: string,
    orderId: string,
    coins: number,
  ) {
    if (coins <= 0) return;
    await this.debitCoins(
      manager,
      userId,
      coins,
      LoyaltyTransactionType.ORDER_REDEMPTION,
      `order-coins:${orderId}`,
      orderId,
      `KuchhV Coins redeemed on order ${orderId}`,
    );
  }

  async refundOrderRewards(
    manager: EntityManager,
    order: OrderEntity,
  ) {
    if (order.coins_redeemed > 0) {
      await this.creditCoins(
        manager,
        order.customer_id,
        order.coins_redeemed,
        LoyaltyTransactionType.ORDER_REDEMPTION_REFUND,
        `order-coins-refund:${order.id}`,
        order.id,
        `KuchhV Coins refunded for rejected order ${order.id}`,
      );
    }
    if (order.vip_deal_discount && Number(order.vip_deal_discount) > 0) {
      const membership = await manager
        .getRepository(VipMembershipEntity)
        .createQueryBuilder('membership')
        .setLock('pessimistic_write')
        .where('membership.user_id = :userId', { userId: order.customer_id })
        .getOne();
      if (
        membership &&
        membership.deal_used_month === this.currentMonth(order.created_at)
      ) {
        membership.deal_used_month = null;
        await manager.getRepository(VipMembershipEntity).save(membership);
      }
    }
  }

  async awardDeliveredOrder(manager: EntityManager, order: OrderEntity) {
    const isPaid = await manager
      .getRepository(PaymentEntity)
      .exists({ where: { order_id: order.id, status: 'SUCCESS' } })
      || await manager
        .getRepository(WalletTransactionEntity)
        .exists({
          where: {
            idempotency_key: `order-payment:${order.id}`,
            direction: WalletTransactionDirection.DEBIT,
          },
        });
    if (!isPaid) return;
    const rewardCoins = Math.floor(this.toCents(order.total_amount) / 10000);
    if (rewardCoins > 0) {
      await this.creditCoins(
        manager,
        order.customer_id,
        rewardCoins,
        LoyaltyTransactionType.ORDER_REWARD,
        `order-coins-earned:${order.id}`,
        order.id,
        `KuchhV Coins for delivered order ${order.id}`,
      );
    }
    const cards = manager.getRepository(ScratchCardEntity);
    const existingCard = await cards.findOne({
      where: { source_order_id: order.id },
    });
    if (!existingCard) {
      await cards.save(
        cards.create({
          user_id: order.customer_id,
          source_order_id: order.id,
          reward_coins: randomInt(1, 26),
          status: 'AVAILABLE',
          scratched_at: null,
        }),
      );
    }
    await this.awardMilestone(manager, order.customer_id, 'orders');
  }

  async awardCompletedRide(
    manager: EntityManager,
    customerId: string,
    rideId: string,
    fare: string,
  ) {
    const rewardCoins = Math.floor(this.toCents(fare) / 10000);
    if (rewardCoins > 0) {
      await this.creditCoins(
        manager,
        customerId,
        rewardCoins,
        LoyaltyTransactionType.RIDE_REWARD,
        `ride-coins-earned:${rideId}`,
        rideId,
        `KuchhV Coins for completed ride ${rideId}`,
      );
    }
    await this.awardMilestone(manager, customerId, 'rides');
  }

  async vipPriority(userId: string, manager: EntityManager) {
    const membership = await manager.getRepository(VipMembershipEntity).findOne({
      where: { user_id: userId, status: 'ACTIVE' },
    });
    return !!membership && membership.expires_at > new Date();
  }

  async getCoinsBalance(userId: string, manager: EntityManager) {
    return (await this.getOrCreateAccount(manager, userId)).coins_balance;
  }

  private async awardMilestone(
    manager: EntityManager,
    userId: string,
    metric: 'orders' | 'rides',
  ) {
    const count =
      metric === 'orders'
        ? await manager.getRepository(OrderEntity).count({
            where: { customer_id: userId, status: 'DELIVERED' },
          })
        : await manager.getRepository(RideEntity).count({
            where: { customer_id: userId, status: RideStatus.COMPLETED },
          });
    for (const badge of MILESTONE_BADGES.filter(
      (item) => item.metric === metric && item.threshold <= count,
    )) {
      await this.grantBadge(manager, userId, badge.key, badge);
    }
  }

  private async grantBadge(
    manager: EntityManager,
    userId: string,
    key: string,
    definition = {
      name: 'VIP Member',
      description: 'Joined KuchhV VIP.',
      icon: 'stars',
    },
  ) {
    const badges = manager.getRepository(LoyaltyBadgeEntity);
    const prior = await badges.findOne({
      where: { user_id: userId, badge_key: key },
    });
    if (prior) return prior;
    return badges.save(
      badges.create({
        user_id: userId,
        badge_key: key,
        name: definition.name,
        description: definition.description,
        icon: definition.icon,
      }),
    );
  }

  private async getOrCreateAccount(
    manager: EntityManager,
    userId: string,
    lock = false,
  ) {
    const accounts = manager.getRepository(LoyaltyAccountEntity);
    await accounts
      .createQueryBuilder()
      .insert()
      .values({ user_id: userId, coins_balance: 0 })
      .orIgnore()
      .execute();
    const query = accounts
      .createQueryBuilder('account')
      .where('account.user_id = :userId', { userId });
    if (lock) query.setLock('pessimistic_write');
    const account = await query.getOne();
    if (!account) throw new NotFoundException('Loyalty account not found');
    return account;
  }

  private async creditCoins(
    manager: EntityManager,
    userId: string,
    coins: number,
    type: LoyaltyTransactionType,
    idempotencyKey: string,
    referenceId: string,
    description: string,
  ) {
    const existing = await manager
      .getRepository(LoyaltyTransactionEntity)
      .findOne({ where: { idempotency_key: idempotencyKey } });
    if (existing) {
      return this.getOrCreateAccount(manager, userId);
    }
    const account = await this.getOrCreateAccount(manager, userId, true);
    const concurrent = await manager
      .getRepository(LoyaltyTransactionEntity)
      .findOne({ where: { idempotency_key: idempotencyKey } });
    if (concurrent) return account;
    account.coins_balance += coins;
    await manager.getRepository(LoyaltyAccountEntity).save(account);
    await manager.getRepository(LoyaltyTransactionEntity).save(
      manager.getRepository(LoyaltyTransactionEntity).create({
        user_id: userId,
        type,
        coins,
        balance_after: account.coins_balance,
        idempotency_key: idempotencyKey,
        reference_id: referenceId,
        description,
      }),
    );
    return account;
  }

  private async debitCoins(
    manager: EntityManager,
    userId: string,
    coins: number,
    type: LoyaltyTransactionType,
    idempotencyKey: string,
    referenceId: string,
    description: string,
  ) {
    const existing = await manager
      .getRepository(LoyaltyTransactionEntity)
      .findOne({ where: { idempotency_key: idempotencyKey } });
    if (existing) return this.getOrCreateAccount(manager, userId);
    const account = await this.getOrCreateAccount(manager, userId, true);
    const concurrent = await manager
      .getRepository(LoyaltyTransactionEntity)
      .findOne({ where: { idempotency_key: idempotencyKey } });
    if (concurrent) return account;
    if (account.coins_balance < coins) {
      throw new ConflictException('Insufficient KuchhV Coins');
    }
    account.coins_balance -= coins;
    await manager.getRepository(LoyaltyAccountEntity).save(account);
    await manager.getRepository(LoyaltyTransactionEntity).save(
      manager.getRepository(LoyaltyTransactionEntity).create({
        user_id: userId,
        type,
        coins: -coins,
        balance_after: account.coins_balance,
        idempotency_key: idempotencyKey,
        reference_id: referenceId,
        description,
      }),
    );
    return account;
  }

  private toCents(value: number | string) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 0) {
      throw new BadRequestException('Invalid loyalty reward amount');
    }
    return Math.round(parsed * 100);
  }

  private currentMonth(date = new Date()) {
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
  }
}
