import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Product } from '../../catalog/entities/product.entity';

@Entity('stock_current')
export class StockCurrent {
  @PrimaryGeneratedColumn('uuid') id: string;
  @ManyToOne(() => Product)
  @JoinColumn({ name: 'product_id' })
  product: Product;
  @Column({ type: 'uuid', nullable: true }) warehouseId?: string | null;
  @Column({ type: 'numeric', precision: 12, scale: 3, default: 0 }) qty: number;
}
