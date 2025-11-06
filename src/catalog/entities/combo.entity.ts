import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ComboItem } from './combo-item.entity';

@Entity('combo')
@Index(['slug'], { unique: true })
export class Combo {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 160 })
  name: string;

  @Column({ length: 180 })
  slug: string;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  @Column({ default: true })
  active: boolean;

  @Column({ type: 'varchar', length: 8, default: 'ARS' })
  currency: string;

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  price: number;

  @Column({ type: 'jsonb', nullable: true })
  badges?: string[] | null;

  // 👇 Forzamos tipo explícito para evitar "Object"
  @Column({ type: 'text', nullable: true, name: 'image_url' })
  imageUrl?: string | null;

  @OneToMany(() => ComboItem, (i) => i.combo, { cascade: true })
  items: ComboItem[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @DeleteDateColumn({ type: 'timestamptz', nullable: true })
  deletedAt?: Date | null;
}
