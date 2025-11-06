import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Category } from './category.entity';
import { ProductImage } from './product-image.entity';

export type UnitType = 'unit' | 'kg' | 'bunch' | 'box';

@Entity('product')
@Index(['slug'], { unique: true })
@Index('idx_product_name_trgm', ['name'], { where: 'deleted_at IS NULL' }) // reforzado con extensión pg_trgm en migración
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 64, unique: true })
  sku: string;

  @Column({ length: 160 })
  name: string;

  @Column({ length: 180 })
  slug: string;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  @Column({ type: 'varchar', length: 12 })
  unitType: UnitType; // unit | kg | bunch | box

  @Column({ type: 'numeric', precision: 10, scale: 3, default: 1 })
  step: number; // incremento (p.ej. 0.5 kg)

  @Column({ type: 'numeric', precision: 10, scale: 3, default: 1 })
  minQty: number;

  @Column({ type: 'numeric', precision: 10, scale: 3, default: 9999 })
  maxQty: number;

  @Column({ type: 'boolean', default: true })
  active: boolean;

  @Column({ type: 'jsonb', nullable: true })
  badges?: string[] | null; // ["Oferta","Premium"]

  @ManyToOne(() => Category, { eager: true })
  @JoinColumn({ name: 'category_id' })
  category: Category;

  @OneToMany(() => ProductImage, (img) => img.product, { cascade: true })
  images: ProductImage[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @DeleteDateColumn({ type: 'timestamptz', nullable: true })
  deletedAt?: Date | null;
}
