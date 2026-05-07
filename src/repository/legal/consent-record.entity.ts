import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Usuario } from '../user/user.entity';

@Entity('consent_record')
export class ConsentRecord {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Usuario, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({ name: 'usuario_id' })
  usuario: Usuario;

  @Column({ type: 'int' })
  usuario_id: number;

  @Column({ type: 'enum', enum: ['terms', 'privacy'] })
  document_type: 'terms' | 'privacy';

  @Column({ type: 'varchar', length: 20 })
  document_version: string;

  @Column({ type: 'boolean', default: true })
  accepted: boolean;

  @Column({ type: 'varchar', length: 45, nullable: true })
  ip_address: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  user_agent: string | null;

  @CreateDateColumn()
  created_at: Date;
}
