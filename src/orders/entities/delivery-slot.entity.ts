import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('delivery_slot')
export class DeliverySlot {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'date' }) date: string; // YYYY-MM-DD
  @Column({ type: 'time' }) startTime: string;
  @Column({ type: 'time' }) endTime: string;
  @Column({ type: 'int', default: 50 }) capacity: number;
  @Column({ type: 'int', default: 0 }) taken: number;
  @Column({ type: 'uuid', nullable: true }) zoneId?: string | null;
}
