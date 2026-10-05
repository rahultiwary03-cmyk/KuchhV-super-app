import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductEntity } from '../products/product.entity';
import { ShopEntity } from '../shops/shop.entity';
import { UserEntity } from '../users/user.entity';
import { OrderController } from './order.controller';
import { OrderItemEntity } from './order-item.entity';
import { OrderEntity } from './order.entity';
import { OrderService } from './order.service';
import { AdsModule } from '../ads/ads.module';
import { LoyaltyModule } from '../loyalty/loyalty.module';

@Module({
  imports: [
    AdsModule,
    LoyaltyModule,
    TypeOrmModule.forFeature([
      OrderEntity,
      OrderItemEntity,
      ProductEntity,
      UserEntity,
      ShopEntity,
    ]),
  ],
  controllers: [OrderController],
  providers: [OrderService],
  exports: [OrderService],
})
export class OrderModule {}
