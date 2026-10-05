import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DeliveryPartnerEntity } from '../delivery/delivery-partner.entity';
import { OrderEntity } from '../orders/order.entity';
import { PaymentEntity } from '../payments/payment.entity';
import { ShopEntity } from '../shops/shop.entity';
import { UserEntity } from '../users/user.entity';
import { WalletController } from './wallet.controller';
import { WalletAccountEntity } from './wallet-account.entity';
import { WalletPayoutBatchEntity } from './wallet-payout-batch.entity';
import { WalletPayoutProfileEntity } from './wallet-payout-profile.entity';
import { WalletPayoutEntity } from './wallet-payout.entity';
import { WalletPayoutScheduler } from './wallet-payout.scheduler';
import { WalletPayoutService } from './wallet-payout.service';
import { WalletRechargeEntity } from './wallet-recharge.entity';
import { WalletTransactionEntity } from './wallet-transaction.entity';
import { WalletService } from './wallet.service';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([
      WalletAccountEntity,
      WalletTransactionEntity,
      WalletRechargeEntity,
      WalletPayoutProfileEntity,
      WalletPayoutEntity,
      WalletPayoutBatchEntity,
      UserEntity,
      ShopEntity,
      DeliveryPartnerEntity,
      OrderEntity,
      PaymentEntity,
    ]),
  ],
  controllers: [WalletController],
  providers: [WalletService, WalletPayoutService, WalletPayoutScheduler],
  exports: [WalletService, WalletPayoutService],
})
export class WalletModule {}
