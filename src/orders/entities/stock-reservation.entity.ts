import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Order } from './order.entity';
import { Product } from '../../catalog/entities/product.entity';

@Entity('stock_reservation')
export class StockReservation {
  @PrimaryGeneratedColumn('uuid') id: string;
  @ManyToOne(() => Order, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order: Order;
  @ManyToOne(() => Product)
  @JoinColumn({ name: 'product_id' })
  product: Product;
  @Column({ type: 'numeric', precision: 12, scale: 3 }) qty: number;
  @CreateDateColumn({ type: 'timestamptz' }) createdAt: Date;
}
