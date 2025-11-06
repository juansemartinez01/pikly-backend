import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('banner')
export class Banner {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ length: 60 }) position: string;
  @Column({ type: 'varchar', length: 160, nullable: true }) title?:
    | string
    | null;
  @Column({ type: 'varchar', length: 200, nullable: true }) subtitle?:
    | string
    | null;
  @Column({ type: 'text', nullable: true }) imageUrl?: string | null;
  @Column({ type: 'text', nullable: true }) linkUrl?: string | null;
  @Column({ default: true }) active: boolean;
  @Column({ type: 'int', default: 0 }) order: number;
}
