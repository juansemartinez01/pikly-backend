// src/orders/entities/delivery-day-template.entity.ts
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('delivery_day_template')
export class DeliveryDayTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // 1 = LUNES ... 7 = DOMINGO
  @Column({ type: 'int' })
  weekday: number;

  @Column({ type: 'time' })
  startTime: string;

  @Column({ type: 'time' })
  endTime: string;

  @Column({ type: 'int', default: 50 })
  capacity: number;

  @Column({ type: 'uuid', nullable: true })
  zoneId?: string | null;

  @Column({ type: 'boolean', default: true })
  active: boolean;
}
