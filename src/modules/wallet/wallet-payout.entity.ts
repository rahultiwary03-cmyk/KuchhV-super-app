import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  Unique,
} from 'typeorm';
import { UserEntity } from '../users/user.entity';
import { WalletAccountEntity } from './wallet-account.entity';

@Entity('wallet_payouts')
@Unique('UQ_wallet_payouts_idempotency_key', ['idempotency_key'])
@Unique('UQ_wallet_payouts_provider_payout_id', ['provider_payout_id'])
export class WalletPayoutEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  wallet_id!: string;

  @ManyToOne(() => WalletAccountEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'wallet_id' })
  wallet!: WalletAccountEntity;

  @Column({ type: 'uuid' })
  user_id!: string;

  @ManyToOne(() => UserEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'user_id' })
  user!: UserEntity;

  @Column({ type: 'uuid', nullable: true })
  batch_id!: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  fund_account_id!: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  provider_payout_id!: string | null;

  @Column({ type: 'varchar', length: 160 })
  idempotency_key!: string;

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  amount!: string;

  @Column({ type: 'varchar', length: 16, default: 'PROCESSING' })
  status!: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  failure_reason!: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at!: Date;
}
