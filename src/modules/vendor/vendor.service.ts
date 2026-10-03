import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrderEntity } from '../orders/order.entity';
import { ProductEntity } from '../products/product.entity';
import { ShopEntity } from '../shops/shop.entity';
import { EventsGateway } from '../events/events.gateway';
import { WorkflowOtpType } from '../../common/entities/otp-challenge.entity';
import { WorkflowOtpService } from '../../common/services/workflow-otp.service';
import { Role } from '../auth/enums/role.enum';
import { UserEntity } from '../users/user.entity';
import { getShopCommissionPercentage } from '../shops/shop-commission';
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
    private readonly otpService: WorkflowOtpService,
    private readonly configService: ConfigService,
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
  ) {}

  async registerShop(ownerId: string, dto: RegisterShopDto) {
    const shop = this.shopRepo.create({
      owner_id: ownerId,
      name: dto.name,
      category: dto.category,
      commission_percentage: getShopCommissionPercentage(
        dto.category,
        this.configService,
      ).toFixed(2),
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
    const order = await this.orderRepo.findOne({
      where: { id: orderId },
      relations: { shop: true },
    });
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    await this.assertShopOwner(order.shop_id, userId, isAdmin);

    const allowedTransition =
      (dto.status === 'ACCEPTED' || dto.status === 'REJECTED') &&
      ['PLACED', 'PAID'].includes(order.status)
        ? true
        : dto.status === 'PREPARING' && order.status === 'ACCEPTED';
    if (!allowedTransition) {
      throw new ConflictException(
        `Cannot change order from ${order.status} to ${dto.status}`,
      );
    }

    order.status = dto.status;
    const savedOrder = await this.orderRepo.save(order);
    this.eventsGateway.sendOrderStatusUpdate(savedOrder.id, savedOrder.status);
    return savedOrder;
  }

  async generatePickupOtp(
    orderId: string,
    vendorId: string,
    isAdmin: boolean,
  ) {
    const order = await this.orderRepo.findOne({
      where: { id: orderId },
      relations: { shop: true },
    });
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    await this.assertShopOwner(order.shop_id, vendorId, isAdmin);
    if (order.status !== 'READY_FOR_PICKUP' || !order.partner_id) {
      throw new ConflictException(
        'Pickup OTP is available only after a partner is assigned',
      );
    }

    const partner = await this.userRepo.findOne({
      where: { id: order.partner_id, role: Role.DELIVERY_PARTNER },
      select: { id: true, phone: true },
    });
    if (!partner) {
      throw new NotFoundException('Assigned delivery partner not found');
    }

    return this.otpService.issue({
      type: WorkflowOtpType.PICKUP,
      orderId: order.id,
      createdById: vendorId,
      destinationPhone: partner.phone,
    });
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
