import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DeliveryPartnerEntity } from '../delivery/delivery-partner.entity';
import { UserEntity } from '../users/user.entity';
import { CustomRequestBidEntity } from './custom-request-bid.entity';
import { CustomRequestController } from './custom-request.controller';
import { CustomRequestEntity } from './custom-request.entity';
import { CustomRequestService } from './custom-request.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CustomRequestEntity,
      CustomRequestBidEntity,
      DeliveryPartnerEntity,
      UserEntity,
    ]),
  ],
  controllers: [CustomRequestController],
  providers: [CustomRequestService],
})
export class CustomRequestModule {}
