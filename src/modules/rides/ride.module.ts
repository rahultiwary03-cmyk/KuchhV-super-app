import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DeliveryPartnerEntity } from '../delivery/delivery-partner.entity';
import { UserEntity } from '../users/user.entity';
import { RideController } from './ride.controller';
import { RideEntity } from './ride.entity';
import { RideService } from './ride.service';

@Module({
  imports: [TypeOrmModule.forFeature([RideEntity, DeliveryPartnerEntity, UserEntity])],
  controllers: [RideController],
  providers: [RideService],
})
export class RideModule {}
