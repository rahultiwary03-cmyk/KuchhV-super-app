import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { ProductEntity } from '../products/product.entity';
import { ShopEntity } from '../shops/shop.entity';
import { UserEntity } from '../users/user.entity';
import { CreateOrderDto } from './dto/order.dto';
import { OrderItemEntity } from './order-item.entity';
import { OrderEntity } from './order.entity';

@Injectable()
export class OrderService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(OrderEntity)
    private readonly orderRepo: Repository<OrderEntity>,
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

      const requestedShop = dto.shop_id
        ? await shops.findOne({
            where: { id: dto.shop_id },
            select: { id: true, is_active: true },
          })
        : null;
      if (dto.shop_id && !requestedShop) {
        throw new NotFoundException('Shop not found');
      }
      if (requestedShop && !requestedShop.is_active) {
        throw new BadRequestException('Shop is not active');
      }

      const productIds = [...new Set(dto.items.map((item) => item.product_id))];
      const foundProducts = await products.findBy({ id: In(productIds) });
      const productById = new Map(
        foundProducts.map((product) => [product.id, product]),
      );

      let shopId = dto.shop_id;
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
        if (shopId === undefined) {
          shopId = product.shop_id;
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

      const savedOrder = await orders.save(
        orders.create({
          customer_id: customer.id,
          shop_id: shopId ?? null,
          total_amount: this.fromCents(totalCents),
          delivery_address: dto.delivery_address,
          status: 'PLACED',
        }),
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
