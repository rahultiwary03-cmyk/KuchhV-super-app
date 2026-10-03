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
import { CustomRequestEntity } from './custom-request.entity';

@Entity('custom_request_bids')
@Unique(['request_id', 'partner_id'])
export class CustomRequestBidEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  request_id!: string;

  @ManyToOne(() => CustomRequestEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'request_id' })
  request!: CustomRequestEntity;

  @Column()
  partner_id!: string;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'partner_id' })
  partner!: UserEntity;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  bid_amount!: string;

  @Column({ default: 'SUBMITTED' })
  status!: string;

  @CreateDateColumn()
  created_at!: Date;
}
