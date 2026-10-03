import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UserEntity } from '../users/user.entity';

export enum ServiceRequestStatus {
  REQUESTED = 'REQUESTED',
  ACCEPTED = 'ACCEPTED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

@Entity('service_requests')
export class ServiceRequestEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  customer_id!: string;

  @ManyToOne(() => UserEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'customer_id' })
  customer!: UserEntity;

  @Column({ type: 'uuid', nullable: true })
  service_provider_id!: string | null;

  @ManyToOne(() => UserEntity, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'service_provider_id' })
  service_provider!: UserEntity | null;

  @Column({ type: 'varchar', length: 120 })
  service_category!: string;

  @Column({ type: 'text' })
  description!: string;

  @Column({ type: 'text' })
  service_address!: string;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  agreed_price!: string | null;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 10 })
  commission_percentage!: string;

  @Column({
    type: 'enum',
    enum: ServiceRequestStatus,
    enumName: 'service_requests_status_enum',
    default: ServiceRequestStatus.REQUESTED,
  })
  status!: ServiceRequestStatus;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at!: Date;
}
