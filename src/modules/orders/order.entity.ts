import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ShopEntity } from '../shops/shop.entity';
import { UserEntity } from '../users/user.entity';

@Entity('orders')
export class OrderEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  customer_id!: string;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'customer_id' })
  customer!: UserEntity;

  @Column()
  shop_id!: string;

  @ManyToOne(() => ShopEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'shop_id' })
  shop!: ShopEntity;

  @Column({ type: 'varchar', nullable: true })
  partner_id!: string | null;

  @Column({ type: 'uuid', nullable: true })
  ad_click_id!: string | null;

  @ManyToOne(() => UserEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'partner_id' })
  partner!: UserEntity | null;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  total_amount!: string;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  commission_percentage!: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  commission_amount!: string;

  @Column({ default: 'PLACED' })
  status!: string;

  @Column({ type: 'text' })
  delivery_address!: string;

  @Column({ type: 'decimal', precision: 10, scale: 6, nullable: true })
  latitude!: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 6, nullable: true })
  longitude!: string | null;

  @CreateDateColumn()
  created_at!: Date;
}
