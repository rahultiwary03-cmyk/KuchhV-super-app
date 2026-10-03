import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { RideEntity } from '../../modules/rides/ride.entity';

export enum WorkflowOtpType {
  PICKUP = 'PICKUP',
  SERVICE_COMPLETION = 'SERVICE_COMPLETION',
  HANDOVER = 'HANDOVER',
  RIDE_START = 'RIDE_START',
}

@Entity('workflow_otp_challenges')
export class OtpChallengeEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 32 })
  type!: WorkflowOtpType;

  @Column({ type: 'uuid', nullable: true })
  order_id!: string | null;

  @Column({ type: 'uuid', nullable: true })
  service_request_id!: string | null;

  @Column({ type: 'uuid', nullable: true })
  ride_id!: string | null;

  @ManyToOne(() => RideEntity, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ride_id' })
  ride!: RideEntity | null;

  @Column({ type: 'uuid' })
  created_by_id!: string;

  @Column({ type: 'varchar', length: 255 })
  destination_phone!: string;

  @Column({ type: 'varchar', length: 64 })
  code_hash!: string;

  @Column({ type: 'timestamptz' })
  expires_at!: Date;

  @Column({ type: 'smallint', default: 0 })
  failed_attempts!: number;

  @Column({ type: 'timestamptz', nullable: true })
  consumed_at!: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;
}
