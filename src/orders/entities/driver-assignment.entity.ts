import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Order } from './order.entity';

@Entity('driver_assignment')
export class DriverAssignment {
  @PrimaryGeneratedColumn('uuid') id: string;

  @ManyToOne(() => Order, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @Column({ type: 'varchar', length: 120, nullable: true }) driverName?:
    | string
    | null;
  @Column({ type: 'varchar', length: 32, nullable: true }) driverPhone?:
    | string
    | null;

  @CreateDateColumn({ type: 'timestamptz' }) assignedAt: Date;
  @Column({ type: 'timestamptz', nullable: true }) deliveredAt?: Date | null;

  @Column({ type: 'text', nullable: true }) proofUrl?: string | null;
}
