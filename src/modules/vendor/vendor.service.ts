import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrderEntity } from '../orders/order.entity';
import { ProductEntity } from '../products/product.entity';
import { ShopEntity } from '../shops/shop.entity';
import { EventsGateway } from '../events/events.gateway';
import {
  CreateProductDto,
  RegisterShopDto,
  UpdateOrderStatusDto,
  UpdateStockDto,
} from './dto/vendor.dto';

@Injectable()
export class VendorService {
  constructor(
    @InjectRepository(ShopEntity)
    private readonly shopRepo: Repository<ShopEntity>,
    @InjectRepository(ProductEntity)
    private readonly productRepo: Repository<ProductEntity>,
    @InjectRepository(OrderEntity)
    private readonly orderRepo: Repository<OrderEntity>,
    private readonly eventsGateway: EventsGateway,
  ) {}

  async registerShop(ownerId: string, dto: RegisterShopDto) {
    const shop = this.shopRepo.create({
      owner_id: ownerId,
      name: dto.name,
      category: dto.category,
      address: dto.address,
      latitude: dto.latitude === undefined ? null : String(dto.latitude),
      longitude: dto.longitude === undefined ? null : String(dto.longitude),
    });
    return this.shopRepo.save(shop);
  }

  async getProducts(shopId: string, userId: string, isAdmin: boolean) {
    await this.assertShopOwner(shopId, userId, isAdmin);
    return this.productRepo.find({ where: { shop_id: shopId } });
  }

  async createProduct(dto: CreateProductDto, userId: string, isAdmin: boolean) {
    const shop = await this.shopRepo.findOne({
      where: { id: dto.shop_id },
    });
    if (!shop) {
      throw new NotFoundException('Shop not found');
    }
    if (!isAdmin && shop.owner_id !== userId) {
      throw new ForbiddenException('You do not own this shop');
    }

    const product = this.productRepo.create({
      ...dto,
      price: String(dto.price),
    });
    return this.productRepo.save(product);
  }

  async updateStock(
    productId: string,
    dto: UpdateStockDto,
    userId: string,
    isAdmin: boolean,
  ) {
    const product = await this.productRepo.findOne({
      where: { id: productId },
      relations: { shop: true },
    });
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    if (!isAdmin && product.shop.owner_id !== userId) {
      throw new ForbiddenException('You do not own this product');
    }

    Object.assign(product, dto);
    return this.productRepo.save(product);
  }

  async getVendorOrders(shopId: string, userId: string, isAdmin: boolean) {
    await this.assertShopOwner(shopId, userId, isAdmin);
    return this.orderRepo.find({
      where: { shop_id: shopId },
      order: { created_at: 'DESC' },
    });
  }

  async updateOrderStatus(
    orderId: string,
    dto: UpdateOrderStatusDto,
    userId: string,
    isAdmin: boolean,
  ) {
    const order = await this.orderRepo.findOne({ where: { id: orderId } });
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    if (order.shop_id) {
      await this.assertShopOwner(order.shop_id, userId, isAdmin);
    } else if (!isAdmin) {
      throw new ForbiddenException('You cannot update this order');
    }

    order.status = dto.status;
    const savedOrder = await this.orderRepo.save(order);
    this.eventsGateway.sendOrderStatusUpdate(savedOrder.id, savedOrder.status);
    return savedOrder;
  }

  private async assertShopOwner(
    shopId: string,
    userId: string,
    isAdmin: boolean,
  ) {
    const shop = await this.shopRepo.findOne({ where: { id: shopId } });
    if (!shop) {
      throw new NotFoundException('Shop not found');
    }
    if (!isAdmin && shop.owner_id !== userId) {
      throw new ForbiddenException('You do not own this shop');
    }
  }
}
