import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { OrderEntity } from '../orders/order.entity';
import { UserEntity } from '../users/user.entity';

@Entity('loyalty_scratch_cards')
export class ScratchCardEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  user_id!: string;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: UserEntity;

  @Column({ type: 'uuid', unique: true })
  source_order_id!: string;

  @ManyToOne(() => OrderEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'source_order_id' })
  source_order!: OrderEntity;

  @Column({ type: 'integer' })
  reward_coins!: number;

  @Column({ type: 'varchar', length: 16, default: 'AVAILABLE' })
  status!: string;

  @Column({ type: 'timestamptz', nullable: true })
  scratched_at!: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at!: Date;
}
