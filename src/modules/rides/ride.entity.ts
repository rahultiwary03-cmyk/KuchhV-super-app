import {
  Column,
  Check,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UserEntity } from '../users/user.entity';

export enum RideStatus {
  REQUESTED = 'REQUESTED',
  ACCEPTED = 'ACCEPTED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum RideVehicleType {
  BIKE = 'BIKE',
  AUTO = 'AUTO',
  CAB = 'CAB',
}

@Entity('rides')
@Check('CHK_rides_vehicle_type', `"vehicle_type" IN ('BIKE', 'AUTO', 'CAB')`)
@Check(
  'CHK_rides_status',
  `"status" IN ('REQUESTED', 'ACCEPTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')`,
)
export class RideEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  customer_id!: string;

  @ManyToOne(() => UserEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'customer_id' })
  customer!: UserEntity;

  @Column({ type: 'uuid', nullable: true })
  driver_id!: string | null;

  @ManyToOne(() => UserEntity, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'driver_id' })
  driver!: UserEntity | null;

  @Column({ type: 'varchar', length: 8 })
  vehicle_type!: RideVehicleType;

  @Column({ type: 'decimal', precision: 10, scale: 6 })
  pickup_latitude!: string;

  @Column({ type: 'decimal', precision: 10, scale: 6 })
  pickup_longitude!: string;

  @Column({ type: 'decimal', precision: 10, scale: 6 })
  drop_latitude!: string;

  @Column({ type: 'decimal', precision: 10, scale: 6 })
  drop_longitude!: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  distance_km!: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  estimated_fare!: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  final_fare!: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  driver_earnings!: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  platform_commission!: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  settled_at!: Date | null;

  @Column({ type: 'varchar', length: 16, default: RideStatus.REQUESTED })
  status!: RideStatus;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at!: Date;
}
