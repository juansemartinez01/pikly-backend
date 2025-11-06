import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('webhook_event')
export class WebhookEvent {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ length: 24 }) provider: string;
  @Column({ length: 80 }) eventId: string;
  @Column({ type: 'varchar', length: 80, nullable: true }) topic?:
    | string
    | null;
  @Column({ type: 'text', nullable: true }) signature?: string | null;
  @Column({ type: 'jsonb', nullable: true }) payload?: any;
  @Column({ default: false }) processed: boolean;
  @CreateDateColumn({ type: 'timestamptz' }) createdAt: Date;
}
