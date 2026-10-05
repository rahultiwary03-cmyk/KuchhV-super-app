import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { WorkflowOtpType } from '../../common/entities/otp-challenge.entity';
import { WorkflowOtpService } from '../../common/services/workflow-otp.service';
import { ProductEntity } from '../products/product.entity';
import { ShopEntity } from '../shops/shop.entity';
import { UserEntity } from '../users/user.entity';
import { CreateOrderDto } from './dto/order.dto';
import { OrderItemEntity } from './order-item.entity';
import { OrderEntity } from './order.entity';
import { AdsService } from '../ads/ads.service';
import { LoyaltyService } from '../loyalty/loyalty.service';

@Injectable()
export class OrderService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(OrderEntity)
    private readonly orderRepo: Repository<OrderEntity>,
    private readonly otpService: WorkflowOtpService,
    private readonly adsService: AdsService,
    private readonly loyaltyService: LoyaltyService,
  ) {}

  async createOrder(customerId: string, dto: CreateOrderDto) {
    return this.dataSource.transaction(async (manager) => {
      const users = manager.getRepository(UserEntity);
      const shops = manager.getRepository(ShopEntity);
      const products = manager.getRepository(ProductEntity);
      const orders = manager.getRepository(OrderEntity);
      const orderItems = manager.getRepository(OrderItemEntity);

      const customer = await users.findOne({
        where: { id: customerId },
        select: { id: true, role: true },
      });
      if (!customer) {
        throw new NotFoundException('Customer not found');
      }
      if (customer.role !== 'CUSTOMER') {
        throw new BadRequestException('Only customers can place orders');
      }

      const requestedShop = await shops.findOne({
        where: { id: dto.shop_id },
        select: { id: true, is_active: true, commission_percentage: true },
      });
      if (!requestedShop) {
        throw new NotFoundException('Shop not found');
      }
      if (!requestedShop.is_active) {
        throw new BadRequestException('Shop is not active');
      }

      const productIds = [...new Set(dto.items.map((item) => item.product_id))];
      const foundProducts = await products.findBy({ id: In(productIds) });
      const productById = new Map(
        foundProducts.map((product) => [product.id, product]),
      );

      const shopId = dto.shop_id;
      let totalCents = 0;
      const lineItems = dto.items.map((item) => {
        const product = productById.get(item.product_id);
        if (!product) {
          throw new NotFoundException(`Product ${item.product_id} not found`);
        }
        if (!product.is_available) {
          throw new BadRequestException(`Product ${product.id} is unavailable`);
        }
        if (product.stock < item.quantity) {
          throw new BadRequestException(`Insufficient stock for product ${product.id}`);
        }
        if (shopId && product.shop_id !== shopId) {
          throw new BadRequestException(
            'All products must belong to the selected shop',
          );
        }
        const unitPriceCents = this.toCents(product.price);
        const subtotalCents = unitPriceCents * item.quantity;
        totalCents += subtotalCents;
        return {
          product_id: product.id,
          quantity: item.quantity,
          unit_price: this.fromCents(unitPriceCents),
          subtotal: this.fromCents(subtotalCents),
        };
      });

      if (
        dto.total_amount !== undefined &&
        this.toCents(dto.total_amount) !== totalCents
      ) {
        throw new BadRequestException(
          'total_amount does not match the product prices',
        );
      }

      const loyalty = await this.loyaltyService.getCheckoutBenefits(
        manager,
        customerId,
        totalCents,
        dto.coins_to_redeem ?? 0,
        dto.use_vip_deal ?? false,
      );
      const payableCents = Math.max(
        0,
        totalCents +
          loyalty.deliveryFeeCents -
          loyalty.vipDealCents -
          loyalty.coinDiscountCents,
      );
      const savedOrder = await orders.save(
        orders.create({
          customer_id: customer.id,
          shop_id: shopId,
          total_amount: this.fromCents(payableCents),
          item_subtotal: this.fromCents(totalCents),
          delivery_fee: this.fromCents(loyalty.deliveryFeeCents),
          vip_deal_discount: this.fromCents(loyalty.vipDealCents),
          coin_discount: this.fromCents(loyalty.coinDiscountCents),
          coins_redeemed: loyalty.requestedCoins,
          vip_free_delivery: loyalty.vipFreeDelivery,
          vip_priority: loyalty.vipActive,
          commission_percentage: requestedShop.commission_percentage,
          commission_amount: this.fromCents(
            Math.round(
              (totalCents *
                this.toCents(requestedShop.commission_percentage)) /
                10000,
            ),
          ),
          delivery_address: dto.delivery_address,
          status: 'PLACED',
          ad_click_id: dto.ad_click_id ?? null,
        }),
      );

      await this.loyaltyService.reserveOrderCoins(
        manager,
        customerId,
        savedOrder.id,
        loyalty.requestedCoins,
      );
      await this.adsService.attachClickToOrder(
        manager,
        dto.ad_click_id,
        customerId,
        shopId,
        savedOrder.id,
        savedOrder.total_amount,
      );

      await orderItems.save(
        lineItems.map((item) =>
          orderItems.create({ ...item, order_id: savedOrder.id }),
        ),
      );

      return {
        success: true,
        message: 'Order placed successfully',
        order_id: savedOrder.id,
        commission_percentage: savedOrder.commission_percentage,
        commission_amount: savedOrder.commission_amount,
        item_subtotal: savedOrder.item_subtotal,
        delivery_fee: savedOrder.delivery_fee,
        vip_deal_discount: savedOrder.vip_deal_discount,
        coin_discount: savedOrder.coin_discount,
        coins_redeemed: savedOrder.coins_redeemed,
        total_amount: savedOrder.total_amount,
        vip_free_delivery: savedOrder.vip_free_delivery,
        vip_priority: savedOrder.vip_priority,
      };
    });
  }

  getCustomerOrders(customerId: string) {
    return this.orderRepo.find({
      where: { customer_id: customerId },
      order: { created_at: 'DESC' },
    });
  }

  async getOrderTracking(orderId: string, userId: string, isAdmin: boolean) {
    const order = await this.orderRepo.findOne({ where: { id: orderId } });
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    if (!isAdmin && order.customer_id !== userId && order.partner_id !== userId) {
      throw new ForbiddenException('You cannot access this order');
    }
    return {
      order_id: order.id,
      status: order.status,
      delivery_address: order.delivery_address,
    };
  }

  async generateHandoverOtp(orderId: string, customerId: string) {
    const order = await this.orderRepo.findOne({
      where: { id: orderId, customer_id: customerId },
      relations: { customer: true },
    });
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    if (order.status !== 'OUT_FOR_DELIVERY' || !order.partner_id) {
      throw new BadRequestException(
        'Handover OTP is available only for an assigned order out for delivery',
      );
    }

    return this.otpService.issue({
      type: WorkflowOtpType.HANDOVER,
      orderId: order.id,
      createdById: customerId,
      destinationPhone: order.customer.phone,
    });
  }

  private toCents(amount: number | string): number {
    const value = Number(amount);
    if (!Number.isFinite(value) || value < 0) {
      throw new BadRequestException('Invalid monetary amount');
    }
    return Math.round(value * 100);
  }

  private fromCents(amount: number): string {
    return (amount / 100).toFixed(2);
  }
}
