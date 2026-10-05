import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('wallet_payout_batches')
export class WalletPayoutBatchEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  batch_key!: string;

  @Column({ type: 'varchar', length: 16 })
  frequency!: string;

  @Column({ type: 'varchar', length: 16, default: 'PROCESSING' })
  status!: string;

  @Column({ type: 'integer', default: 0 })
  payout_count!: number;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;
}
