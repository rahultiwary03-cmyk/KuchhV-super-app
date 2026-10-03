import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrderEntity } from '../orders/order.entity';
import { ProductEntity } from '../products/product.entity';
import { ShopEntity } from '../shops/shop.entity';
import { UserEntity } from '../users/user.entity';
import { VendorController } from './vendor.controller';
import { VendorService } from './vendor.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ShopEntity,
      ProductEntity,
      OrderEntity,
      UserEntity,
    ]),
  ],
  controllers: [VendorController],
  providers: [VendorService],
})
export class VendorModule {}
