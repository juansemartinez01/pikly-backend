import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Customer } from './customer.entity';

@Entity('address')
export class Address {
  @PrimaryGeneratedColumn('uuid') id: string;

  @ManyToOne(() => Customer, { nullable: true })
  @JoinColumn({ name: 'customer_id' })
  customer?: Customer | null;

  @Column({type: 'varchar', length: 60, nullable: true }) label?: string | null;
  @Column({type: 'varchar', length: 160 }) street: string;
  @Column({type: 'varchar', length: 32, nullable: true }) number?: string | null;
  @Column({type: 'varchar', length: 32, nullable: true }) floor?: string | null;
  @Column({type: 'varchar', length: 32, nullable: true }) apartment?: string | null;
  @Column({type: 'varchar', length: 120, nullable: true }) city?: string | null;
  @Column({type: 'varchar', length: 120, nullable: true }) province?: string | null;
  @Column({type: 'varchar', length: 20, nullable: true }) zip?: string | null;
  @Column({ type: 'text', nullable: true }) notes?: string | null;
  @Column({ type: 'numeric', precision: 10, scale: 6, nullable: true })
  geoLat?: number | null;
  @Column({ type: 'numeric', precision: 10, scale: 6, nullable: true })
  geoLng?: number | null;
  @Column({ default: false }) isDefault: boolean;
}
