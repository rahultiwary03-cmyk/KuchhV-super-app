import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { UserEntity } from '../users/user.entity';

@Entity('custom_requests')
export class CustomRequestEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  customer_id!: string;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'customer_id' })
  customer!: UserEntity;

  @Column({ type: 'text' })
  item_description!: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  offered_price!: string;

  @Column({ type: 'varchar', nullable: true })
  assigned_partner_id!: string | null;

  @ManyToOne(() => UserEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'assigned_partner_id' })
  assigned_partner!: UserEntity | null;

  @Column({ default: 'BROADCASTING' })
  status!: string;

  @CreateDateColumn()
  created_at!: Date;
}
