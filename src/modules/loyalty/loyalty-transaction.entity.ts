import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { UserEntity } from '../users/user.entity';

export enum LoyaltyTransactionType {
  ORDER_REWARD = 'ORDER_REWARD',
  RIDE_REWARD = 'RIDE_REWARD',
  SCRATCH_CARD_REWARD = 'SCRATCH_CARD_REWARD',
  ORDER_REDEMPTION = 'ORDER_REDEMPTION',
  ORDER_REDEMPTION_REFUND = 'ORDER_REDEMPTION_REFUND',
}

@Entity('loyalty_transactions')
@Index('UQ_loyalty_transactions_idempotency_key', ['idempotency_key'], {
  unique: true,
})
export class LoyaltyTransactionEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  user_id!: string;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: UserEntity;

  @Column({ type: 'varchar', length: 32 })
  type!: LoyaltyTransactionType;

  @Column({ type: 'integer' })
  coins!: number;

  @Column({ type: 'integer' })
  balance_after!: number;

  @Column({ type: 'varchar', length: 160, unique: true })
  idempotency_key!: string;

  @Column({ type: 'varchar', length: 160, nullable: true })
  reference_id!: string | null;

  @Column({ type: 'varchar', length: 255 })
  description!: string;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;
}
