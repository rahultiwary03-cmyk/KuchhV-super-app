import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrderEntity } from '../orders/order.entity';
import { UserEntity } from '../users/user.entity';
import { DeliveryController } from './delivery.controller';
import { DeliveryPartnerEntity } from './delivery-partner.entity';
import { DeliveryService } from './delivery.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      DeliveryPartnerEntity,
      OrderEntity,
      UserEntity,
    ]),
  ],
  controllers: [DeliveryController],
  providers: [DeliveryService],
})
export class DeliveryModule {}
