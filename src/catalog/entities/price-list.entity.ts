import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('price_list')
@Index(['name'], { unique: true })
export class PriceList {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 48 })
  name: string; // Retail / Mayorista

  @Column({ length: 8, default: 'ARS' })
  currency: string;

  @Column({ default: true })
  active: boolean;

  @Column({ type: 'int', default: 100 })
  priority: number; // menor número = mayor prioridad

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @DeleteDateColumn({ type: 'timestamptz', nullable: true })
  deletedAt?: Date | null;
}
