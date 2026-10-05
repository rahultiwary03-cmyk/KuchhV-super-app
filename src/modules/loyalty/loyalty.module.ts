import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrderEntity } from '../orders/order.entity';
import { PaymentEntity } from '../payments/payment.entity';
import { RideEntity } from '../rides/ride.entity';
import { UserEntity } from '../users/user.entity';
import { WalletModule } from '../wallet/wallet.module';
import { LoyaltyAccountEntity } from './loyalty-account.entity';
import { LoyaltyBadgeEntity } from './loyalty-badge.entity';
import { LoyaltyController } from './loyalty.controller';
import { LoyaltyService } from './loyalty.service';
import { LoyaltyTransactionEntity } from './loyalty-transaction.entity';
import { ScratchCardEntity } from './scratch-card.entity';
import { VipMembershipEntity } from './vip-membership.entity';

@Global()
@Module({
  imports: [
    WalletModule,
    TypeOrmModule.forFeature([
      LoyaltyAccountEntity,
      LoyaltyTransactionEntity,
      VipMembershipEntity,
      LoyaltyBadgeEntity,
      ScratchCardEntity,
      OrderEntity,
      PaymentEntity,
      RideEntity,
      UserEntity,
    ]),
  ],
  controllers: [LoyaltyController],
  providers: [LoyaltyService],
  exports: [LoyaltyService],
})
export class LoyaltyModule {}
