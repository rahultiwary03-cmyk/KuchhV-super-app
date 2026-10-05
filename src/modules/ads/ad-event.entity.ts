import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AdCampaignEntity } from './ad-campaign.entity';
import { OrderEntity } from '../orders/order.entity';
import { UserEntity } from '../users/user.entity';

export enum AdEventType {
  IMPRESSION = 'IMPRESSION',
  CLICK = 'CLICK',
  CONVERSION = 'CONVERSION',
}

@Entity('ad_events')
@Index('UQ_ad_events_event_key', ['event_key'], { unique: true })
@Index('UQ_ad_events_dedupe_key', ['dedupe_key'], { unique: true })
@Index('UQ_ad_events_conversion_order', ['order_id'], {
  unique: true,
  where: '"order_id" IS NOT NULL',
})
@Index('IDX_ad_events_campaign_type_created', [
  'campaign_id',
  'event_type',
  'created_at',
])
export class AdEventEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  campaign_id!: string;

  @ManyToOne(() => AdCampaignEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'campaign_id' })
  campaign!: AdCampaignEntity;

  @Column({ type: 'uuid' })
  user_id!: string;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: UserEntity;

  @Column({ type: 'varchar', length: 16 })
  event_type!: AdEventType;

  @Column({ type: 'varchar', length: 80 })
  event_key!: string;

  @Column({ type: 'varchar', length: 120 })
  dedupe_key!: string;

  @Column({ type: 'uuid', nullable: true })
  order_id!: string | null;

  @ManyToOne(() => OrderEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'order_id' })
  order!: OrderEntity | null;

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0 })
  charge_amount!: string;

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0 })
  conversion_value!: string;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;
}
