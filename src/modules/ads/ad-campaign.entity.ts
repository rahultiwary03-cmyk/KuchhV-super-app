import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ProductEntity } from '../products/product.entity';
import { ShopEntity } from '../shops/shop.entity';
import { UserEntity } from '../users/user.entity';

export enum AdPlacement {
  SPONSORED_LISTING = 'SPONSORED_LISTING',
  BANNER = 'BANNER',
}

export enum AdBillingModel {
  CPC = 'CPC',
  CPM = 'CPM',
}

export enum AdCampaignStatus {
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  STOPPED = 'STOPPED',
  EXHAUSTED = 'EXHAUSTED',
}

@Entity('ad_campaigns')
export class AdCampaignEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  owner_user_id!: string;

  @ManyToOne(() => UserEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'owner_user_id' })
  owner!: UserEntity;

  @Column({ type: 'uuid' })
  shop_id!: string;

  @ManyToOne(() => ShopEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'shop_id' })
  shop!: ShopEntity;

  @Column({ type: 'uuid', nullable: true })
  product_id!: string | null;

  @ManyToOne(() => ProductEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'product_id' })
  product!: ProductEntity | null;

  @Column({ type: 'varchar', length: 120 })
  name!: string;

  @Column({ type: 'varchar', length: 24 })
  placement!: AdPlacement;

  @Column({ type: 'varchar', length: 16 })
  billing_model!: AdBillingModel;

  @Column({ type: 'varchar', length: 100, nullable: true })
  target_category!: string | null;

  @Column({ type: 'text', nullable: true })
  banner_image_url!: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  banner_link_url!: string | null;

  @Column({ type: 'numeric', precision: 10, scale: 2 })
  bid_amount!: string;

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  budget_amount!: string;

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0 })
  spent_amount!: string;

  @Column({ type: 'varchar', length: 16, default: 'ACTIVE' })
  status!: AdCampaignStatus;

  @Column({ type: 'timestamptz', nullable: true })
  starts_at!: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  ends_at!: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at!: Date;
}
