import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { DeliveryPartnerEntity } from '../delivery/delivery-partner.entity';
import { OrderEntity } from '../orders/order.entity';
import { UserEntity } from '../users/user.entity';
import { EventsGateway } from './events.gateway';

@Global()
@Module({
  imports: [
    AuthModule,
    TypeOrmModule.forFeature([
      UserEntity,
      OrderEntity,
      DeliveryPartnerEntity,
    ]),
  ],
  providers: [EventsGateway],
  exports: [EventsGateway],
})
export class EventsModule {}
