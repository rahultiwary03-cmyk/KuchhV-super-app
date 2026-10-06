import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { WalletAccountEntity } from './wallet-account.entity';

export enum WalletTransactionDirection {
  CREDIT = 'CREDIT',
  DEBIT = 'DEBIT',
}

export enum WalletTransactionType {
  OPENING_BALANCE = 'OPENING_BALANCE',
  RECHARGE = 'RECHARGE',
  ORDER_PAYMENT = 'ORDER_PAYMENT',
  ORDER_EARNING = 'ORDER_EARNING',
  PLATFORM_COMMISSION = 'PLATFORM_COMMISSION',
  RIDE_EARNING = 'RIDE_EARNING',
  CASHBACK = 'CASHBACK',
  PAYOUT = 'PAYOUT',
  PAYOUT_REVERSAL = 'PAYOUT_REVERSAL',
  AD_CAMPAIGN_FUNDING = 'AD_CAMPAIGN_FUNDING',
  AD_CAMPAIGN_REFUND = 'AD_CAMPAIGN_REFUND',
  VIP_SUBSCRIPTION = 'VIP_SUBSCRIPTION',
}

@Entity('wallet_transactions')
@Unique('UQ_wallet_transactions_idempotency_key', ['idempotency_key'])
@Index('IDX_wallet_transactions_account_created', ['wallet_id', 'created_at'])
export class WalletTransactionEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  wallet_id!: string;

  @ManyToOne(() => WalletAccountEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'wallet_id' })
  wallet!: WalletAccountEntity;

  @Column({ type: 'varchar', length: 32 })
  type!: WalletTransactionType;

  @Column({ type: 'varchar', length: 8 })
  direction!: WalletTransactionDirection;

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  amount!: string;

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  balance_after!: string;

  @Column({ type: 'varchar', length: 160 })
  idempotency_key!: string;

  @Column({ type: 'varchar', length: 160, nullable: true })
  reference_id!: string | null;

  @Column({ type: 'varchar', length: 255 })
  description!: string;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;
}
