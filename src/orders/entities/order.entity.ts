import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Customer } from './customer.entity';
import { Address } from './address.entity';
import { PriceList } from '../../catalog/entities/price-list.entity';
import { DeliverySlot } from './delivery-slot.entity';
import { OrderItem } from './order-item.entity';

export type OrderStatus =
  | 'created'
  | 'payment_pending'
  | 'paid'
  | 'to_pick'
  | 'packed'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled'
  | 'failed';
export type PaymentStatus = 'pending' | 'approved' | 'rejected' | 'refunded';

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn('uuid') id: string;

  @Column({ length: 32, unique: true }) orderNumber: string;

  @ManyToOne(() => Customer, { nullable: true })
  @JoinColumn({ name: 'customer_id' })
  customer?: Customer | null;
  @ManyToOne(() => Address, { nullable: true })
  @JoinColumn({ name: 'address_id' })
  address?: Address | null;

  @Column({ type: 'uuid', nullable: true }) cartId?: string | null;

  @Column({ length: 24, default: 'created' }) status: OrderStatus;
  @Column({ length: 24, default: 'pending' }) paymentStatus: PaymentStatus;

  @ManyToOne(() => PriceList, { nullable: true })
  @JoinColumn({ name: 'price_list_id' })
  priceList?: PriceList | null;

  @Column({ length: 8, default: 'ARS' }) currency: string;
  @Column({ type: 'numeric', precision: 14, scale: 2 }) subtotal: number;
  @Column({ type: 'numeric', precision: 14, scale: 2 }) discountTotal: number;
  @Column({ type: 'numeric', precision: 14, scale: 2, default: 0 })
  shippingTotal: number;
  @Column({ type: 'numeric', precision: 14, scale: 2 }) total: number;

  @Column({ type: 'date', nullable: true }) deliveryDate?: string | null;
  @ManyToOne(() => DeliverySlot, { nullable: true })
  @JoinColumn({ name: 'delivery_slot_id' })
  deliverySlot?: DeliverySlot | null;

  @Column({ type: 'text', nullable: true }) notes?: string | null;

  @OneToMany(() => OrderItem, (i) => i.order, { cascade: true })
  items: OrderItem[];

  @CreateDateColumn({ type: 'timestamptz' }) createdAt: Date;
  @UpdateDateColumn({ type: 'timestamptz' }) updatedAt: Date;
}
