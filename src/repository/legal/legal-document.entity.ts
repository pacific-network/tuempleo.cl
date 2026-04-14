import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Unique,
} from 'typeorm';

@Entity('legal_document')
@Unique(['type', 'version'])
export class LegalDocument {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'enum', enum: ['terms', 'privacy'] })
  type: 'terms' | 'privacy';

  @Column({ type: 'varchar', length: 20 })
  version: string;

  @Column({ type: 'longtext' })
  content: string;

  @Column({ type: 'boolean', default: false })
  is_current: boolean;

  @CreateDateColumn()
  created_at: Date;
}
