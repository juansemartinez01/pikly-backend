import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Order } from './order.entity';

@Entity('order_status_history')
export class OrderStatusHistory {
  @PrimaryGeneratedColumn('uuid') id: string;
  @ManyToOne(() => Order, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order: Order;
  @Column({type: 'varchar', length: 24, nullable: true }) fromStatus?: string | null;
  @Column({ length: 24 }) toStatus: string;
  @Column({ type: 'text', nullable: true }) note?: string | null;
  @Column({type: 'varchar', length: 120, nullable: true }) changedBy?: string | null;
  @CreateDateColumn({ type: 'timestamptz' }) createdAt: Date;
}
