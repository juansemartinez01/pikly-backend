import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('setting')
export class Setting {
  @PrimaryColumn({ type: 'varchar', length: 120 })
  key: string;

  @Column({ type: 'jsonb', nullable: true })
  value?: any;
}
