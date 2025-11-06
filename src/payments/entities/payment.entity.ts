import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Order } from '../../orders/entities/order.entity';

@Entity('payment')
export class Payment {
  @PrimaryGeneratedColumn('uuid') id: string;

  @ManyToOne(() => Order, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @Column({ length: 24 }) provider: string; // mercadopago
  @Column({ type: 'varchar', length: 64, nullable: true }) providerPaymentId?:
    | string
    | null;
  @Column({ length: 24 }) status: string;
  @Column({ type: 'numeric', precision: 14, scale: 2, default: 0 })
  amount: number;
  @Column({ type: 'timestamptz', nullable: true }) approvedAt?: Date | null;
  @Column({ type: 'jsonb', nullable: true }) raw?: any;

  @CreateDateColumn({ type: 'timestamptz' }) createdAt: Date;
  @UpdateDateColumn({ type: 'timestamptz' }) updatedAt: Date;
}
