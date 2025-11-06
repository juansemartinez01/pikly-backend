import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Combo } from './combo.entity';
import { Product } from './product.entity';

@Entity('combo_item')
export class ComboItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Combo, (c) => c.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'combo_id' })
  combo: Combo;

  @ManyToOne(() => Product, { eager: true })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @Column({ type: 'numeric', precision: 10, scale: 3 })
  qty: number; // cantidad por combo

  @Column({ length: 12 })
  unitType: 'unit' | 'kg' | 'bunch' | 'box';
}
