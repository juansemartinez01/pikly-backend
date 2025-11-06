import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Order } from './order.entity';
import { Product } from '../../catalog/entities/product.entity';
import { Combo } from '../../catalog/entities/combo.entity';

@Entity('order_item')
export class OrderItem {
  @PrimaryGeneratedColumn('uuid') id: string;

  @ManyToOne(() => Order, (o) => o.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @ManyToOne(() => Product, { nullable: true })
  @JoinColumn({ name: 'product_id' })
  product?: Product | null;
  @ManyToOne(() => Combo, { nullable: true })
  @JoinColumn({ name: 'combo_id' })
  combo?: Combo | null;

  @Column({ length: 200 }) nameSnapshot: string;
  @Column({type: 'varchar', length: 64, nullable: true }) skuSnapshot?: string | null;

  @Column({ length: 12 }) unitType: 'unit' | 'kg' | 'bunch' | 'box' | 'combo';
  @Column({ type: 'numeric', precision: 10, scale: 3 }) qty: number;

  @Column({ type: 'numeric', precision: 12, scale: 2 }) unitPrice: number;
  @Column({ type: 'numeric', precision: 12, scale: 2, nullable: true })
  compareAtPrice?: number | null;

  @Column({ type: 'numeric', precision: 14, scale: 2 }) total: number;
}
