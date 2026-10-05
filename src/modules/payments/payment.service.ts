import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { timingSafeEqual, createHmac } from 'crypto';
import Razorpay from 'razorpay';
import { DataSource, Repository } from 'typeorm';
import { OrderEntity } from '../orders/order.entity';
import { EventsGateway } from '../events/events.gateway';
import { CreateRazorpayOrderDto } from './dto/payment.dto';
import { PaymentEntity } from './payment.entity';
import { WalletService } from '../wallet/wallet.service';
import {
  WalletTransactionDirection,
  WalletTransactionType,
} from '../wallet/wallet-transaction.entity';
import { WalletRechargeEntity } from '../wallet/wallet-recharge.entity';

interface RazorpayWebhookPayment {
  id?: string;
  order_id: string;
  amount: number;
  currency: string;
}

interface RazorpayWebhookPayload {
  event: string;
  payload?: {
    payment?: {
      entity?: RazorpayWebhookPayment;
    };
  };
}

@Injectable()
export class PaymentService {
  constructor(
    private readonly configService: ConfigService,
    private readonly dataSource: DataSource,
    @InjectRepository(PaymentEntity)
    private readonly paymentRepo: Repository<PaymentEntity>,
    @InjectRepository(OrderEntity)
    private readonly orderRepo: Repository<OrderEntity>,
    private readonly eventsGateway: EventsGateway,
    private readonly walletService: WalletService,
  ) {}

  async createWalletRecharge(amount: number, customerId: string) {
    const amountPaise = this.toPaise(amount);
    if (amountPaise < 5000 || amountPaise > 5000000) {
      throw new BadRequestException(
        'Wallet recharge must be between INR 50 and INR 50,000',
      );
    }
    const keyId = this.configService.get<string>('RAZORPAY_KEY_ID');
    const keySecret = this.configService.get<string>('RAZORPAY_KEY_SECRET');
    if (!keyId || !keySecret) {
      throw new ServiceUnavailableException(
        'Razorpay credentials are not configured',
      );
    }
    const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });
    const razorpayOrder = await razorpay.orders.create({
      amount: amountPaise,
      currency: 'INR',
      receipt: `wallet-${customerId.slice(0, 8)}-${Date.now()}`,
    });
    await this.dataSource.getRepository(WalletRechargeEntity).save(
      this.dataSource.getRepository(WalletRechargeEntity).create({
        user_id: customerId,
        razorpay_order_id: razorpayOrder.id,
        razorpay_payment_id: null,
        amount: (amountPaise / 100).toFixed(2),
        status: 'PENDING',
      }),
    );
    return {
      success: true,
      razorpay_order_id: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      key_id: keyId,
      checkout_method: 'UPI_OR_CARD',
    };
  }

  async createRazorpayOrder(dto: CreateRazorpayOrderDto, customerId: string) {
    const keyId = this.configService.get<string>('RAZORPAY_KEY_ID');
    const keySecret = this.configService.get<string>('RAZORPAY_KEY_SECRET');
    if (!keyId || !keySecret) {
      throw new ServiceUnavailableException(
        'Razorpay credentials are not configured',
      );
    }

    const payment = await this.dataSource.transaction(async (manager) => {
      const order = await manager
        .getRepository(OrderEntity)
        .createQueryBuilder('order')
        .setLock('pessimistic_write')
        .where('order.id = :orderId', { orderId: dto.order_id })
        .getOne();
      if (!order) throw new NotFoundException('Order not found');
      if (order.customer_id !== customerId) {
        throw new ForbiddenException('You cannot pay for this order');
      }
      if (order.status !== 'PLACED') {
        throw new ConflictException('Order is not awaiting payment');
      }

      const amountPaise = this.toPaise(order.total_amount);
      if (amountPaise <= 0 || this.toPaise(dto.amount) !== amountPaise) {
        throw new BadRequestException(
          'Payment amount must match the order total',
        );
      }
      const payments = manager.getRepository(PaymentEntity);
      const pending = await payments.findOne({
        where: [
          { order_id: order.id, status: 'INITIATING' },
          { order_id: order.id, status: 'PENDING' },
        ],
      });
      if (pending) {
        throw new ConflictException(
          'A payment attempt already exists for this order',
        );
      }
      return payments.save(
        payments.create({
          order_id: order.id,
          transaction_id: null,
          payment_mode: 'RAZORPAY',
          amount: order.total_amount,
          status: 'INITIATING',
        }),
      );
    });

    const razorpay = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });
    let razorpayOrder: {
      id: string;
      amount: number | string;
      currency: string;
    };
    try {
      razorpayOrder = await razorpay.orders.create({
        amount: this.toPaise(payment.amount),
        currency: 'INR',
        receipt: payment.order_id,
      });
    } catch (error) {
      payment.status = 'FAILED';
      await this.paymentRepo.save(payment);
      throw error;
    }
    payment.transaction_id = razorpayOrder.id;
    payment.status = 'PENDING';
    await this.paymentRepo.save(payment);

    return {
      success: true,
      razorpay_order_id: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      key_id: keyId,
    };
  }

  async verifyWebhook(
    signature: string | undefined,
    rawBody: Buffer | undefined,
    payload: unknown,
  ) {
    const webhookSecret = this.configService.get<string>(
      'RAZORPAY_WEBHOOK_SECRET',
    );
    if (!webhookSecret) {
      throw new ServiceUnavailableException(
        'Razorpay webhook secret is not configured',
      );
    }
    if (!signature || !rawBody || !/^[a-f\d]{64}$/i.test(signature)) {
      throw new BadRequestException('Missing or invalid webhook signature');
    }

    const expectedSignature = createHmac('sha256', webhookSecret)
      .update(rawBody)
      .digest();
    const receivedSignature = Buffer.from(signature, 'hex');
    if (
      receivedSignature.length !== expectedSignature.length ||
      !timingSafeEqual(receivedSignature, expectedSignature)
    ) {
      throw new BadRequestException('Invalid Razorpay webhook signature');
    }

    const event = this.parseWebhookPayload(payload);
    if (event.event !== 'payment.captured' && event.event !== 'payment.failed') {
      return { status: 'ok', ignored: true };
    }

    const razorpayOrderId = event.payload?.payment?.entity?.order_id;
    const capturedPayment = event.payload?.payment?.entity;
    if (!razorpayOrderId || !capturedPayment) {
      throw new BadRequestException('Invalid payment event payload');
    }

    const result = await this.dataSource.transaction(async (manager) => {
      const payments = manager.getRepository(PaymentEntity);
      const orders = manager.getRepository(OrderEntity);
      const payment = await payments.findOne({
        where: { transaction_id: razorpayOrderId },
      });
      if (!payment) {
        const recharge = await manager
          .getRepository(WalletRechargeEntity)
          .createQueryBuilder('recharge')
          .setLock('pessimistic_write')
          .where('recharge.razorpay_order_id = :razorpayOrderId', {
            razorpayOrderId,
          })
          .getOne();
        if (!recharge) {
          return {
            response: { status: 'ok', ignored: true },
            orderUpdate: undefined,
          };
        }
        if (event.event === 'payment.captured') {
          if (
            capturedPayment.currency !== 'INR' ||
            capturedPayment.amount !== this.toPaise(recharge.amount) ||
            !capturedPayment.id
          ) {
            throw new BadRequestException(
              'Wallet recharge payment amount, currency, or ID is invalid',
            );
          }
          if (recharge.status !== 'SUCCESS') {
            recharge.status = 'SUCCESS';
            recharge.razorpay_payment_id = capturedPayment.id;
            await manager.getRepository(WalletRechargeEntity).save(recharge);
            await this.walletService.postTransaction(manager, {
              userId: recharge.user_id,
              type: WalletTransactionType.RECHARGE,
              direction: WalletTransactionDirection.CREDIT,
              amount: recharge.amount,
              idempotencyKey: `wallet-recharge:${recharge.id}`,
              referenceId: capturedPayment.id,
              description: 'Wallet recharge captured by Razorpay',
            });
          }
        } else if (recharge.status === 'PENDING') {
          recharge.status = 'FAILED';
          await manager.getRepository(WalletRechargeEntity).save(recharge);
        }
        return {
          response: { status: 'ok' },
          orderUpdate: undefined,
        };
      }

      let orderUpdate: { orderId: string; status: string } | undefined;
      if (event.event === 'payment.captured') {
        if (
          capturedPayment.currency !== 'INR' ||
          capturedPayment.amount !== this.toPaise(payment.amount)
        ) {
          throw new BadRequestException(
            'Webhook payment amount or currency does not match the order',
          );
        }

        if (payment.status !== 'SUCCESS') {
          payment.status = 'SUCCESS';
          await payments.save(payment);

          const order = await orders.findOne({
            where: { id: payment.order_id },
          });
          if (!order) {
            throw new NotFoundException('Order not found for payment');
          }
          if (order.status === 'PLACED') {
            order.status = 'PAID';
            await orders.save(order);
            orderUpdate = { orderId: order.id, status: order.status };
          }
        }
      } else if (payment.status === 'PENDING') {
        payment.status = 'FAILED';
        await payments.save(payment);
      }

      return { response: { status: 'ok' }, orderUpdate };
    });
    if (result.orderUpdate) {
      this.eventsGateway.sendOrderStatusUpdate(
        result.orderUpdate.orderId,
        result.orderUpdate.status,
      );
    }
    return result.response;
  }

  private parseWebhookPayload(payload: unknown): RazorpayWebhookPayload {
    if (
      typeof payload !== 'object' ||
      payload === null ||
      !('event' in payload)
    ) {
      throw new BadRequestException('Invalid Razorpay webhook payload');
    }

    const body = payload as Record<string, unknown>;
    if (typeof body.event !== 'string') {
      throw new BadRequestException('Invalid Razorpay webhook payload');
    }

    if (
      body.event === 'payment.captured' ||
      body.event === 'payment.failed'
    ) {
      const eventPayload = body.payload;
      const paymentEvent =
        typeof eventPayload === 'object' && eventPayload !== null
          ? (eventPayload as Record<string, unknown>).payment
          : undefined;
      const payment =
        typeof paymentEvent === 'object' && paymentEvent !== null
          ? (paymentEvent as Record<string, unknown>).entity
          : undefined;
      const entity =
        typeof payment === 'object' && payment !== null
          ? (payment as Record<string, unknown>)
          : undefined;
      if (
        !entity ||
        typeof entity.id !== 'string' ||
        typeof entity.order_id !== 'string' ||
        typeof entity.amount !== 'number' ||
        !Number.isFinite(entity.amount) ||
        typeof entity.currency !== 'string'
      ) {
        throw new BadRequestException('Invalid payment event payload');
      }

      return {
        event: body.event,
        payload: {
          payment: {
            entity: {
              id: entity.id,
              order_id: entity.order_id,
              amount: entity.amount,
              currency: entity.currency,
            },
          },
        },
      };
    }

    return { event: body.event };
  }

  private toPaise(amount: number | string): number {
    const value = Number(amount);
    if (!Number.isFinite(value) || value < 0) {
      throw new BadRequestException('Invalid payment amount');
    }
    const paise = Math.round(value * 100);
    if (!Number.isSafeInteger(paise)) {
      throw new BadRequestException('Payment amount is out of range');
    }
    return paise;
  }
}
