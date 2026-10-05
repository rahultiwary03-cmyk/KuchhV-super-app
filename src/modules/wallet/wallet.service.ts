import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { OrderEntity } from '../orders/order.entity';
import { PaymentEntity } from '../payments/payment.entity';
import { ShopEntity } from '../shops/shop.entity';
import { WalletAccountEntity } from './wallet-account.entity';
import {
  WalletTransactionDirection,
  WalletTransactionEntity,
  WalletTransactionType,
} from './wallet-transaction.entity';

interface PostWalletTransaction {
  userId: string;
  type: WalletTransactionType;
  direction: WalletTransactionDirection;
  amount: number | string;
  idempotencyKey: string;
  referenceId?: string | null;
  description: string;
}

@Injectable()
export class WalletService {
  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(WalletAccountEntity)
    private readonly walletRepo: Repository<WalletAccountEntity>,
  ) {}

  async getOrCreateAccount(
    manager: EntityManager,
    userId: string,
    lock = false,
  ): Promise<WalletAccountEntity> {
    const wallets = manager.getRepository(WalletAccountEntity);
    await wallets
      .createQueryBuilder()
      .insert()
      .values({ user_id: userId, balance: '0.00' })
      .orIgnore()
      .execute();
    const query = wallets.createQueryBuilder('wallet').where(
      'wallet.user_id = :userId',
      { userId },
    );
    if (lock) query.setLock('pessimistic_write');
    const wallet = await query.getOne();
    if (!wallet) {
      throw new NotFoundException('Wallet account not found');
    }
    return wallet;
  }

  async postTransaction(
    manager: EntityManager,
    input: PostWalletTransaction,
  ): Promise<WalletTransactionEntity> {
    const transactions = manager.getRepository(WalletTransactionEntity);
    const existing = await transactions.findOne({
      where: { idempotency_key: input.idempotencyKey },
    });
    if (existing) return existing;

    const amountCents = this.toCents(input.amount);
    if (amountCents <= 0) {
      throw new BadRequestException('Wallet transaction amount must be positive');
    }
    const wallet = await this.getOrCreateAccount(manager, input.userId, true);
    const currentCents = this.toCents(wallet.balance);
    const nextCents =
      input.direction === WalletTransactionDirection.CREDIT
        ? currentCents + amountCents
        : currentCents - amountCents;
    if (nextCents < 0) {
      throw new ConflictException('Insufficient wallet balance');
    }

    wallet.balance = this.fromCents(nextCents);
    await manager.getRepository(WalletAccountEntity).save(wallet);
    return transactions.save(
      transactions.create({
        wallet_id: wallet.id,
        type: input.type,
        direction: input.direction,
        amount: this.fromCents(amountCents),
        balance_after: wallet.balance,
        idempotency_key: input.idempotencyKey,
        reference_id: input.referenceId ?? null,
        description: input.description,
      }),
    );
  }

  async getBalance(userId: string) {
    return this.walletRepo.manager.transaction(async (manager) => {
      const wallet = await this.getOrCreateAccount(manager, userId);
      return { balance: wallet.balance, currency: 'INR' };
    });
  }

  getHistory(userId: string, limit = 50) {
    return this.walletRepo.manager.transaction(async (manager) => {
      const wallet = await this.getOrCreateAccount(manager, userId);
      return manager.getRepository(WalletTransactionEntity).find({
        where: { wallet_id: wallet.id },
        order: { created_at: 'DESC' },
        take: Math.min(Math.max(limit, 1), 100),
      });
    });
  }

  async payOrder(orderId: string, customerId: string) {
    return this.walletRepo.manager.transaction(async (manager) => {
      const order = await manager
        .getRepository(OrderEntity)
        .createQueryBuilder('order')
        .setLock('pessimistic_write')
        .where('order.id = :orderId', { orderId })
        .getOne();
      if (!order) throw new NotFoundException('Order not found');
      if (order.customer_id !== customerId) {
        throw new ForbiddenException('You cannot pay for this order');
      }
      if (order.status !== 'PLACED') {
        throw new ConflictException('Order is not awaiting payment');
      }
      const activeGatewayPayment = await manager
        .getRepository(PaymentEntity)
        .findOne({
          where: [
            {
              order_id: order.id,
              payment_mode: 'RAZORPAY',
              status: 'INITIATING',
            },
            {
              order_id: order.id,
              payment_mode: 'RAZORPAY',
              status: 'PENDING',
            },
          ],
        });
      if (activeGatewayPayment) {
        throw new ConflictException(
          'A Razorpay payment attempt is already in progress',
        );
      }

      await this.postTransaction(manager, {
        userId: customerId,
        type: WalletTransactionType.ORDER_PAYMENT,
        direction: WalletTransactionDirection.DEBIT,
        amount: order.total_amount,
        idempotencyKey: `order-payment:${order.id}`,
        referenceId: order.id,
        description: `Wallet payment for order ${order.id}`,
      });
      order.status = 'PAID';
      await manager.getRepository(OrderEntity).save(order);
      return { success: true, order_id: order.id, status: order.status };
    });
  }

  async settleDeliveredOrder(manager: EntityManager, orderId: string) {
    const orders = manager.getRepository(OrderEntity);
    const order = await orders.findOne({ where: { id: orderId } });
    if (!order || order.status !== 'DELIVERED') return;
    const isPaidByWallet = await manager
      .getRepository(WalletTransactionEntity)
      .exists({
        where: {
          idempotency_key: `order-payment:${order.id}`,
          direction: WalletTransactionDirection.DEBIT,
        },
      });
    const isPaidByGateway = await manager
      .getRepository(PaymentEntity)
      .exists({
        where: { order_id: order.id, status: 'SUCCESS' },
      });
    if (!isPaidByWallet && !isPaidByGateway) return;

    const grossCents = this.toCents(order.total_amount);
    const commissionCents = this.toCents(order.commission_amount);
    if (commissionCents > grossCents) {
      throw new ConflictException('Order commission exceeds the paid amount');
    }
    const shop = await manager.getRepository(ShopEntity).findOne({
      where: { id: order.shop_id },
      select: { id: true, owner_id: true },
    });
    if (!shop) {
      throw new NotFoundException('Shop owner not found for order settlement');
    }

    if (grossCents > 0) {
      await this.postTransaction(manager, {
        userId: shop.owner_id,
        type: WalletTransactionType.ORDER_EARNING,
        direction: WalletTransactionDirection.CREDIT,
        amount: this.fromCents(grossCents),
        idempotencyKey: `order-earning:${order.id}`,
        referenceId: order.id,
        description: `Vendor proceeds for delivered order ${order.id}`,
      });
    }

    if (commissionCents > 0) {
      await this.postTransaction(manager, {
        userId: shop.owner_id,
        type: WalletTransactionType.PLATFORM_COMMISSION,
        direction: WalletTransactionDirection.DEBIT,
        amount: this.fromCents(commissionCents),
        idempotencyKey: `order-commission:${order.id}`,
        referenceId: order.id,
        description: `Platform commission for delivered order ${order.id}`,
      });
    }

    const cashbackPercent = this.getCashbackPercent();
    const cashbackPercentCents = this.toCents(cashbackPercent);
    const cashbackCents = Math.floor(
      (grossCents * cashbackPercentCents) / 10000,
    );
    if (cashbackCents > 0) {
      await this.postTransaction(manager, {
        userId: order.customer_id,
        type: WalletTransactionType.CASHBACK,
        direction: WalletTransactionDirection.CREDIT,
        amount: this.fromCents(cashbackCents),
        idempotencyKey: `order-cashback:${order.id}`,
        referenceId: order.id,
        description: `Cashback for delivered order ${order.id}`,
      });
    }
  }

  toCents(amount: number | string): number {
    const value = Number(amount);
    if (!Number.isFinite(value) || value < 0) {
      throw new BadRequestException('Invalid wallet amount');
    }
    const cents = Math.round(value * 100);
    if (!Number.isSafeInteger(cents)) {
      throw new BadRequestException('Wallet amount is out of range');
    }
    return cents;
  }

  fromCents(cents: number): string {
    return (cents / 100).toFixed(2);
  }

  private getCashbackPercent() {
    const configured = this.configService.get<string>(
      'WALLET_CASHBACK_PERCENT',
    );
    const percentage = configured === undefined ? 1 : Number(configured);
    if (!Number.isFinite(percentage) || percentage < 0 || percentage > 100) {
      throw new BadRequestException(
        'WALLET_CASHBACK_PERCENT must be between 0 and 100',
      );
    }
    return percentage;
  }
}
