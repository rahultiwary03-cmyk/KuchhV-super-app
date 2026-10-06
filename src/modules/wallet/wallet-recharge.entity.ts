import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { UserEntity } from '../users/user.entity';

@Entity('wallet_recharges')
@Unique('UQ_wallet_recharges_razorpay_order_id', ['razorpay_order_id'])
@Unique('UQ_wallet_recharges_razorpay_payment_id', ['razorpay_payment_id'])
export class WalletRechargeEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  user_id!: string;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: UserEntity;

  @Column({ type: 'varchar', length: 64 })
  razorpay_order_id!: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  razorpay_payment_id!: string | null;

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  amount!: string;

  @Column({ type: 'varchar', length: 16, default: 'PENDING' })
  status!: string;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;
}
