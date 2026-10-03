import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { UserEntity } from '../users/user.entity';

@Entity('delivery_partners')
export class DeliveryPartnerEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  user_id!: string;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: UserEntity;

  @Column()
  vehicle_type!: string;

  @Column()
  vehicle_number!: string;

  @Column({ default: 'PENDING' })
  kyc_status!: string;

  @Column({ default: false })
  is_online!: boolean;

  @Column({ type: 'decimal', precision: 10, scale: 6, nullable: true })
  current_lat!: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 6, nullable: true })
  current_lng!: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0.0 })
  wallet_balance!: string;
}
