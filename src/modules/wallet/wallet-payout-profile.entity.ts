import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  Unique,
} from 'typeorm';
import { UserEntity } from '../users/user.entity';

@Entity('wallet_payout_profiles')
@Unique('UQ_wallet_payout_profiles_user_id', ['user_id'])
export class WalletPayoutProfileEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  user_id!: string;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: UserEntity;

  @Column({ type: 'varchar', length: 100 })
  vpa_ciphertext!: string;

  @Column({ type: 'varchar', length: 32 })
  vpa_iv!: string;

  @Column({ type: 'varchar', length: 32 })
  vpa_auth_tag!: string;

  @Column({ type: 'varchar', length: 64 })
  razorpay_contact_id!: string;

  @Column({ type: 'varchar', length: 64 })
  razorpay_fund_account_id!: string;

  @Column({ type: 'boolean', default: true })
  is_active!: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at!: Date;
}
