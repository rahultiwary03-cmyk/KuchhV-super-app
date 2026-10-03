import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { UserEntity } from '../users/user.entity';

@Entity('shops')
export class ShopEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  owner_id!: string;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'owner_id' })
  owner!: UserEntity;

  @Column()
  name!: string;

  @Column()
  category!: string;

  @Column({ type: 'text' })
  address!: string;

  @Column({ type: 'decimal', precision: 10, scale: 6, nullable: true })
  latitude!: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 6, nullable: true })
  longitude!: string | null;

  @Column({ default: true })
  is_active!: boolean;

  @Column({ type: 'decimal', precision: 3, scale: 2, default: 5.0 })
  rating!: string;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 10 })
  commission_percentage!: string;
}
