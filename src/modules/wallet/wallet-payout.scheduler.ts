import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { WalletPayoutService } from './wallet-payout.service';

@Injectable()
export class WalletPayoutScheduler {
  private readonly logger = new Logger(WalletPayoutScheduler.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly payoutService: WalletPayoutService,
  ) {}

  @Cron('0 15 1 * * *', { timeZone: 'Asia/Kolkata' })
  async processScheduledPayouts() {
    if (this.configService.get<string>('WALLET_PAYOUTS_ENABLED') !== 'true') {
      return;
    }
    try {
      const result = await this.payoutService.runScheduledBatch();
      this.logger.log(JSON.stringify(result));
    } catch (error) {
      this.logger.error(
        `Scheduled wallet payout batch failed: ${
          error instanceof Error ? error.message : 'Unknown payout error'
        }`,
      );
    }
  }
}
