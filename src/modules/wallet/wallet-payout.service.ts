import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  randomUUID,
  timingSafeEqual,
} from 'crypto';
import { EntityManager, Repository } from 'typeorm';
import { Role } from '../auth/enums/role.enum';
import { DeliveryPartnerEntity } from '../delivery/delivery-partner.entity';
import { ShopEntity } from '../shops/shop.entity';
import { UserEntity } from '../users/user.entity';
import { WalletAccountEntity } from './wallet-account.entity';
import { WalletPayoutBatchEntity } from './wallet-payout-batch.entity';
import { WalletPayoutProfileEntity } from './wallet-payout-profile.entity';
import { WalletPayoutEntity } from './wallet-payout.entity';
import {
  WalletTransactionDirection,
  WalletTransactionEntity,
  WalletTransactionType,
} from './wallet-transaction.entity';
import { WalletService } from './wallet.service';

interface RazorpayXResponse {
  id?: string;
  status?: string;
  error?: { description?: string };
}

interface PayoutWebhook {
  event: string;
  payload?: { payout?: { entity?: { id?: string; status?: string } } };
}

@Injectable()
export class WalletPayoutService {
  private readonly logger = new Logger(WalletPayoutService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly walletService: WalletService,
    @InjectRepository(WalletAccountEntity)
    private readonly walletRepo: Repository<WalletAccountEntity>,
    @InjectRepository(WalletTransactionEntity)
    private readonly transactionRepo: Repository<WalletTransactionEntity>,
    @InjectRepository(WalletPayoutProfileEntity)
    private readonly profileRepo: Repository<WalletPayoutProfileEntity>,
    @InjectRepository(WalletPayoutEntity)
    private readonly payoutRepo: Repository<WalletPayoutEntity>,
    @InjectRepository(WalletPayoutBatchEntity)
    private readonly batchRepo: Repository<WalletPayoutBatchEntity>,
  ) {}

  async setProfile(userId: string, vpa: string) {
    const user = await this.profileRepo.manager
      .getRepository(UserEntity)
      .findOne({ where: { id: userId } });
    if (!user || ![Role.VENDOR, Role.DELIVERY_PARTNER].includes(user.role)) {
      throw new ForbiddenException(
        'Only vendors and delivery partners can register a payout account',
      );
    }
    if (user.status !== 'APPROVED') {
      throw new ForbiddenException(
        'Account approval is required before registering a payout account',
      );
    }
    if (user.role === Role.VENDOR) {
      const shop = await this.profileRepo.manager
        .getRepository(ShopEntity)
        .findOne({
          where: { owner_id: userId, is_active: true },
          select: { id: true },
        });
      if (!shop) {
        throw new ForbiddenException('An active vendor shop is required');
      }
    } else {
      const partner = await this.profileRepo.manager
        .getRepository(DeliveryPartnerEntity)
        .findOne({
          where: { user_id: userId, kyc_status: 'VERIFIED' },
          relations: { user: true },
        });
      if (!partner || partner.user.status !== 'APPROVED') {
        throw new ForbiddenException(
          'Verified delivery-partner KYC is required for payouts',
        );
      }
    }

    const credentials = this.getRazorpayXCredentials();
    const encryptedVpa = this.encryptVpa(vpa);
    const contact = await this.providerRequest<RazorpayXResponse>(
      '/contacts',
      credentials,
      {
        name: user.name.slice(0, 50),
        contact: user.phone.replace(/^\+/, ''),
        type: 'vendor',
        reference_id: `wallet-user-${user.id}`,
      },
    );
    if (!contact.id) {
      throw new ServiceUnavailableException(
        'RazorpayX did not return a contact identifier',
      );
    }
    const fundAccount = await this.providerRequest<RazorpayXResponse>(
      '/fund_accounts',
      credentials,
      {
        contact_id: contact.id,
        account_type: 'vpa',
        vpa: { address: vpa },
      },
    );
    if (!fundAccount.id) {
      throw new ServiceUnavailableException(
        'RazorpayX did not return a VPA fund-account identifier',
      );
    }

    const existing = await this.profileRepo.findOne({
      where: { user_id: userId },
    });
    const profile = this.profileRepo.create({
      ...existing,
      user_id: userId,
      ...encryptedVpa,
      razorpay_contact_id: contact.id,
      razorpay_fund_account_id: fundAccount.id,
      is_active: true,
    });
    await this.profileRepo.save(profile);
    return {
      success: true,
      payout_profile: {
        configured: true,
        vpa: this.maskVpa(vpa),
      },
    };
  }

  async getProfile(userId: string) {
    const profile = await this.profileRepo.findOne({ where: { user_id: userId } });
    return {
      configured: !!profile?.is_active,
      vpa: profile?.is_active
        ? this.maskVpa(this.decryptVpa(profile))
        : null,
    };
  }

  async getPayoutHistory(userId: string) {
    return this.payoutRepo.find({
      where: { user_id: userId },
      order: { created_at: 'DESC' },
      take: 50,
    });
  }

  async reconcilePayout(payoutId: string) {
    const payout = await this.payoutRepo.findOne({
      where: { id: payoutId },
    });
    if (!payout) throw new NotFoundException('Payout not found');
    if (['SUCCESS', 'FAILED'].includes(payout.status)) {
      return { payout_id: payout.id, status: payout.status };
    }

    const credentials = this.getRazorpayXCredentials();
    if (!payout.provider_payout_id) {
      if (!payout.fund_account_id) {
        throw new ConflictException(
          'This payout has no saved destination account; verify it in RazorpayX before taking manual action',
        );
      }
      const accountNumber = this.configService.get<string>(
        'RAZORPAYX_ACCOUNT_NUMBER',
      );
      if (!accountNumber) {
        throw new ServiceUnavailableException(
          'RazorpayX payout source account is not configured',
        );
      }
      await this.submitPayout(payout, accountNumber, credentials);
    } else {
      const result = await this.providerRequest<RazorpayXResponse>(
        `/payouts/${encodeURIComponent(payout.provider_payout_id)}`,
        credentials,
        undefined,
        undefined,
        'GET',
      );
      const status = this.mapProviderStatus(result.status);
      if (status === 'SUCCESS' || status === 'FAILED') {
        await this.applyPayoutResult(
          payout.provider_payout_id,
          status,
          result.status ?? 'RazorpayX payout status',
          result.status?.toLowerCase() === 'reversed',
        );
      } else {
        payout.status = status;
        await this.payoutRepo.save(payout);
      }
    }
    const latest = await this.payoutRepo.findOneByOrFail({ id: payout.id });
    return { payout_id: latest.id, status: latest.status };
  }

  async runScheduledBatch() {
    const frequency = this.getPayoutFrequency();
    const localDate = this.currentLocalDate();
    if (frequency === 'weekly' && localDate.weekday !== 'Mon') {
      return { skipped: true, reason: 'Weekly payouts run on Monday' };
    }
    const periodKey =
      frequency === 'daily'
        ? `${frequency}:${localDate.date}`
        : `${frequency}:${this.mondayOfWeek(localDate.date)}`;
    return this.processBatch(periodKey, frequency);
  }

  async runManualBatch() {
    return this.processBatch(
      `manual:${new Date().toISOString()}:${randomUUID()}`,
      'manual',
    );
  }

  async verifyPayoutWebhook(
    signature: string | undefined,
    rawBody: Buffer | undefined,
    payload: unknown,
  ) {
    const secret = this.configService.get<string>('RAZORPAYX_WEBHOOK_SECRET');
    if (!secret) {
      throw new ServiceUnavailableException(
        'RazorpayX webhook secret is not configured',
      );
    }
    if (!signature || !rawBody || !/^[a-f\d]{64}$/i.test(signature)) {
      throw new BadRequestException('Missing or invalid payout webhook signature');
    }
    const expected = createHmac('sha256', secret).update(rawBody).digest();
    const received = Buffer.from(signature, 'hex');
    if (
      received.length !== expected.length ||
      !timingSafeEqual(received, expected)
    ) {
      throw new BadRequestException('Invalid payout webhook signature');
    }

    const event = this.parsePayoutWebhook(payload);
    const payoutId = event.payload?.payout?.entity?.id;
    if (
      !payoutId ||
      !['payout.processed', 'payout.failed', 'payout.reversed'].includes(
        event.event,
      )
    ) {
      return { status: 'ok', ignored: true };
    }

    await this.applyPayoutResult(
      payoutId,
      event.event === 'payout.processed' ? 'SUCCESS' : 'FAILED',
      event.payload?.payout?.entity?.status ?? event.event,
      event.event === 'payout.reversed',
    );
    return { status: 'ok' };
  }

  private async processBatch(batchKey: string, frequency: string) {
    if (this.configService.get<string>('WALLET_PAYOUTS_ENABLED') !== 'true') {
      throw new ServiceUnavailableException(
        'Wallet payouts are disabled until explicitly enabled',
      );
    }
    const credentials = this.getRazorpayXCredentials();
    const accountNumber = this.configService.get<string>(
      'RAZORPAYX_ACCOUNT_NUMBER',
    );
    if (!accountNumber) {
      throw new ServiceUnavailableException(
        'RazorpayX payout source account is not configured',
      );
    }

    let batch: WalletPayoutBatchEntity;
    try {
      batch = await this.batchRepo.save(
        this.batchRepo.create({
          batch_key: batchKey,
          frequency,
          status: 'PROCESSING',
          payout_count: 0,
        }),
      );
    } catch (error) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === '23505'
      ) {
        return { skipped: true, reason: 'This payout batch was already created' };
      }
      throw error;
    }

    const minimumAmount = this.getMinimumPayout();
    const profiles = await this.profileRepo.find({
      where: { is_active: true },
      relations: { user: true },
      order: { created_at: 'ASC' },
    });
    let payoutCount = 0;
    for (const profile of profiles) {
      if (
        profile.user.role !== Role.VENDOR &&
        profile.user.role !== Role.DELIVERY_PARTNER
      ) {
        continue;
      }
      if (!(await this.isPayoutEligible(profile.user))) continue;
      const payout = await this.reservePayout(
        batch,
        profile,
        minimumAmount,
      );
      if (!payout) continue;
      payoutCount += 1;
      try {
        await this.submitPayout(payout, accountNumber, credentials);
      } catch (error) {
        this.logger.error(
          `Payout ${payout.id} remains pending reconciliation: ${
            error instanceof Error ? error.message : 'Unknown provider error'
          }`,
        );
      }
    }
    batch.status = 'SUBMITTED';
    batch.payout_count = payoutCount;
    await this.batchRepo.save(batch);
    return { batch_id: batch.id, frequency, payout_count: payoutCount };
  }

  private async isPayoutEligible(user: UserEntity) {
    if (user.status !== 'APPROVED') return false;
    if (user.role === Role.DELIVERY_PARTNER) {
      const partner = await this.profileRepo.manager
        .getRepository(DeliveryPartnerEntity)
        .findOne({
          where: { user_id: user.id, kyc_status: 'VERIFIED' },
          relations: { user: true },
        });
      return !!partner && partner.user.status === 'APPROVED';
    }
    const shop = await this.profileRepo.manager
      .getRepository(ShopEntity)
      .findOne({
        where: { owner_id: user.id, is_active: true },
        select: { id: true },
      });
    return !!shop;
  }

  private reservePayout(
    batch: WalletPayoutBatchEntity,
    profile: WalletPayoutProfileEntity,
    minimumAmount: number,
  ) {
    return this.walletRepo.manager.transaction(async (manager) => {
      const partner =
        profile.user.role === Role.DELIVERY_PARTNER
          ? await manager
              .getRepository(DeliveryPartnerEntity)
              .createQueryBuilder('partner')
              .setLock('pessimistic_write')
              .where('partner.user_id = :userId', {
                userId: profile.user_id,
              })
              .getOne()
          : null;
      if (
        profile.user.role === Role.DELIVERY_PARTNER &&
        (!partner || partner.kyc_status !== 'VERIFIED')
      ) {
        return null;
      }
      const wallet = await this.walletService.getOrCreateAccount(
        manager,
        profile.user_id,
        true,
      );
      const balanceCents = this.walletService.toCents(wallet.balance);
      if (balanceCents < minimumAmount) return null;

      const idempotencyKey = randomUUID();
      const payout = await manager.getRepository(WalletPayoutEntity).save(
        manager.getRepository(WalletPayoutEntity).create({
          wallet_id: wallet.id,
          user_id: profile.user_id,
          batch_id: batch.id,
          fund_account_id: profile.razorpay_fund_account_id,
          provider_payout_id: null,
          idempotency_key: idempotencyKey,
          amount: this.walletService.fromCents(balanceCents),
          status: 'PROCESSING',
          failure_reason: null,
        }),
      );
      const debit = await this.walletService.postTransaction(manager, {
        userId: profile.user_id,
        type: WalletTransactionType.PAYOUT,
        direction: WalletTransactionDirection.DEBIT,
        amount: payout.amount,
        idempotencyKey: `payout-debit:${payout.id}`,
        referenceId: payout.id,
        description: 'Wallet balance reserved for UPI payout',
      });
      if (partner) {
        partner.wallet_balance = debit.balance_after;
        await manager.getRepository(DeliveryPartnerEntity).save(partner);
      }
      return payout;
    });
  }

  private async submitPayout(
    payout: WalletPayoutEntity,
    accountNumber: string,
    credentials: { keyId: string; keySecret: string },
  ) {
    if (!payout.fund_account_id) {
      throw new ConflictException(
        'Cannot submit payout without its saved destination account',
      );
    }
    let result: RazorpayXResponse;
    try {
      result = await this.providerRequest<RazorpayXResponse>(
        '/payouts',
        credentials,
        {
          account_number: accountNumber,
          fund_account_id: payout.fund_account_id,
          amount: this.walletService.toCents(payout.amount),
          currency: 'INR',
          mode: 'UPI',
          purpose: 'payout',
          queue_if_low_balance: false,
          reference_id: payout.id,
          narration: 'KuchhV wallet settlement',
        },
        payout.idempotency_key,
      );
    } catch (error) {
      if (error instanceof BadRequestException) {
        await this.markPayoutFailedById(payout.id, error.message);
      }
      throw error;
    }
    if (!result.id) {
      throw new ServiceUnavailableException(
        'RazorpayX did not return a payout identifier; reconcile before retrying',
      );
    }
    payout.provider_payout_id = result.id;
    const providerStatus = this.mapProviderStatus(result.status);
    payout.status = providerStatus === 'FAILED' ? 'SUBMITTED' : providerStatus;
    await this.payoutRepo.save(payout);
    if (providerStatus === 'FAILED') {
      await this.applyPayoutResult(result.id, 'FAILED', 'Payout rejected');
    }
  }

  private async applyPayoutResult(
    providerPayoutId: string,
    nextStatus: 'SUCCESS' | 'FAILED',
    failureReason: string,
    isReversal = false,
  ) {
    await this.walletRepo.manager.transaction(async (manager) => {
      const payouts = manager.getRepository(WalletPayoutEntity);
      const payout = await payouts
        .createQueryBuilder('payout')
        .setLock('pessimistic_write')
        .where('payout.provider_payout_id = :providerPayoutId', {
          providerPayoutId,
        })
        .getOne();
      if (!payout || payout.status === 'FAILED') return;
      if (payout.status === 'SUCCESS' && !isReversal) return;
      payout.status = nextStatus;
      payout.failure_reason = nextStatus === 'FAILED' ? failureReason : null;
      await payouts.save(payout);

      if (nextStatus === 'FAILED') {
        await this.refundPayout(manager, payout);
      }
    });
  }

  private async markPayoutFailedById(payoutId: string, reason: string) {
    await this.walletRepo.manager.transaction(async (manager) => {
      const payouts = manager.getRepository(WalletPayoutEntity);
      const payout = await payouts
        .createQueryBuilder('payout')
        .setLock('pessimistic_write')
        .where('payout.id = :payoutId', { payoutId })
        .getOne();
      if (!payout || ['SUCCESS', 'FAILED'].includes(payout.status)) return;
      payout.status = 'FAILED';
      payout.failure_reason = reason.slice(0, 500);
      await payouts.save(payout);
      await this.refundPayout(manager, payout);
    });
  }

  private async refundPayout(
    manager: EntityManager,
    payout: WalletPayoutEntity,
  ) {
    const partner = await manager
      .getRepository(DeliveryPartnerEntity)
      .createQueryBuilder('partner')
      .setLock('pessimistic_write')
      .where('partner.user_id = :userId', { userId: payout.user_id })
      .getOne();
    const refund = await this.walletService.postTransaction(manager, {
      userId: payout.user_id,
      type: WalletTransactionType.PAYOUT_REVERSAL,
      direction: WalletTransactionDirection.CREDIT,
      amount: payout.amount,
      idempotencyKey: `payout-refund:${payout.id}`,
      referenceId: payout.id,
      description: 'Failed UPI payout returned to wallet',
    });
    if (partner) {
      partner.wallet_balance = refund.balance_after;
      await manager.getRepository(DeliveryPartnerEntity).save(partner);
    }
    return refund;
  }

  private getRazorpayXCredentials() {
    const keyId = this.configService.get<string>('RAZORPAYX_KEY_ID');
    const keySecret = this.configService.get<string>('RAZORPAYX_KEY_SECRET');
    if (!keyId || !keySecret) {
      throw new ServiceUnavailableException(
        'RazorpayX payout credentials are not configured',
      );
    }
    return { keyId, keySecret };
  }

  private async providerRequest<T extends RazorpayXResponse>(
    path: string,
    credentials: { keyId: string; keySecret: string },
    body?: Record<string, unknown>,
    idempotencyKey?: string,
    method: 'GET' | 'POST' = 'POST',
  ): Promise<T> {
    const response = await fetch(`https://api.razorpay.com/v1${path}`, {
      method,
      headers: {
        Authorization: `Basic ${Buffer.from(
          `${credentials.keyId}:${credentials.keySecret}`,
        ).toString('base64')}`,
        'Content-Type': 'application/json',
        ...(idempotencyKey
          ? { 'X-Payout-Idempotency': idempotencyKey }
          : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
      signal: AbortSignal.timeout(15000),
    });
    const result: unknown = await response.json();
    if (!response.ok) {
      const error = this.asProviderResponse(result);
      if (response.status >= 400 && response.status < 500) {
        throw new BadRequestException(
          error.error?.description ?? 'RazorpayX rejected the request',
        );
      }
      throw new ServiceUnavailableException(
        'RazorpayX request failed; result may require reconciliation',
      );
    }
    return this.asProviderResponse(result) as T;
  }

  private asProviderResponse(value: unknown): RazorpayXResponse {
    if (typeof value !== 'object' || value === null) return {};
    const candidate = value as Record<string, unknown>;
    const error =
      typeof candidate.error === 'object' && candidate.error !== null
        ? (candidate.error as Record<string, unknown>)
        : undefined;
    return {
      ...(typeof candidate.id === 'string' ? { id: candidate.id } : {}),
      ...(typeof candidate.status === 'string'
        ? { status: candidate.status }
        : {}),
      ...(typeof error?.description === 'string'
        ? { error: { description: error.description } }
        : {}),
    };
  }

  private parsePayoutWebhook(value: unknown): PayoutWebhook {
    if (typeof value !== 'object' || value === null) {
      throw new BadRequestException('Invalid RazorpayX payout webhook payload');
    }
    const body = value as Record<string, unknown>;
    if (typeof body.event !== 'string') {
      throw new BadRequestException('Invalid RazorpayX payout webhook payload');
    }
    const payload =
      typeof body.payload === 'object' && body.payload !== null
        ? (body.payload as Record<string, unknown>)
        : undefined;
    const payout =
      typeof payload?.payout === 'object' && payload.payout !== null
        ? (payload.payout as Record<string, unknown>)
        : undefined;
    const entity =
      typeof payout?.entity === 'object' && payout.entity !== null
        ? (payout.entity as Record<string, unknown>)
        : undefined;
    if (['payout.processed', 'payout.failed', 'payout.reversed'].includes(body.event)) {
      if (!entity || typeof entity.id !== 'string') {
        throw new BadRequestException(
          'Invalid payout details in RazorpayX webhook',
        );
      }
      return {
        event: body.event,
        payload: {
          payout: {
            entity: {
              id: entity.id,
              ...(typeof entity.status === 'string'
                ? { status: entity.status }
                : {}),
            },
          },
        },
      };
    }
    return { event: body.event };
  }

  private mapProviderStatus(status: string | undefined) {
    switch (status?.toLowerCase()) {
      case 'processed':
        return 'SUCCESS';
      case 'failed':
      case 'reversed':
      case 'rejected':
        return 'FAILED';
      case 'queued':
      case 'pending':
      case 'processing':
      case 'created':
        return 'SUBMITTED';
      default:
        return 'PROCESSING';
    }
  }

  private getPayoutFrequency(): 'daily' | 'weekly' {
    const frequency = (
      this.configService.get<string>('WALLET_PAYOUT_FREQUENCY') ?? 'daily'
    ).toLowerCase();
    if (frequency !== 'daily' && frequency !== 'weekly') {
      throw new BadRequestException(
        'WALLET_PAYOUT_FREQUENCY must be daily or weekly',
      );
    }
    return frequency;
  }

  private getMinimumPayout() {
    const configured = this.configService.get<string>(
      'WALLET_PAYOUT_MINIMUM_INR',
    );
    const value = configured === undefined ? 100 : Number(configured);
    if (!Number.isFinite(value) || value < 1) {
      throw new BadRequestException(
        'WALLET_PAYOUT_MINIMUM_INR must be at least 1',
      );
    }
    return this.walletService.toCents(value);
  }

  private currentLocalDate() {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Kolkata',
      weekday: 'short',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(new Date());
    const part = (type: string) => {
      const value = parts.find((item) => item.type === type)?.value;
      if (!value) throw new Error(`Unable to resolve local date part: ${type}`);
      return value;
    };
    return {
      weekday: part('weekday'),
      date: `${part('year')}-${part('month')}-${part('day')}`,
    };
  }

  private mondayOfWeek(date: string) {
    const monday = new Date(`${date}T12:00:00.000Z`);
    const daysSinceMonday = (monday.getUTCDay() + 6) % 7;
    monday.setUTCDate(monday.getUTCDate() - daysSinceMonday);
    return monday.toISOString().slice(0, 10);
  }

  private encryptVpa(vpa: string) {
    const key = this.piiEncryptionKey();
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', key, iv);
    const ciphertext = Buffer.concat([
      cipher.update(vpa, 'utf8'),
      cipher.final(),
    ]);
    return {
      vpa_ciphertext: ciphertext.toString('base64'),
      vpa_iv: iv.toString('hex'),
      vpa_auth_tag: cipher.getAuthTag().toString('hex'),
    };
  }

  private decryptVpa(profile: WalletPayoutProfileEntity) {
    const decipher = createDecipheriv(
      'aes-256-gcm',
      this.piiEncryptionKey(),
      Buffer.from(profile.vpa_iv, 'hex'),
    );
    decipher.setAuthTag(Buffer.from(profile.vpa_auth_tag, 'hex'));
    return Buffer.concat([
      decipher.update(Buffer.from(profile.vpa_ciphertext, 'base64')),
      decipher.final(),
    ]).toString('utf8');
  }

  private piiEncryptionKey() {
    const secret = this.configService.get<string>(
      'WALLET_PII_ENCRYPTION_KEY',
    );
    if (!secret || secret.length < 32) {
      throw new ServiceUnavailableException(
        'WALLET_PII_ENCRYPTION_KEY must be configured with at least 32 characters',
      );
    }
    return createHash('sha256').update(secret).digest();
  }

  private maskVpa(vpa: string) {
    const [name, handle] = vpa.split('@');
    return `${name.slice(0, 2)}***@${handle}`;
  }
}
