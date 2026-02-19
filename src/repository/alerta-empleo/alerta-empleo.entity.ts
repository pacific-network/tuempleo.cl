import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Postulante } from '../postulant/postulant.entity';

@Entity('alerta_empleo')
export class AlertaEmpleo {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Postulante, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({ name: 'postulante_id' })
  postulante: Postulante;

  @Column({ type: 'varchar', length: 255, nullable: true })
  keywords: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  categoria: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  modalidad: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  region: string | null;

  @Column({ type: 'boolean', default: true })
  activa: boolean;

  @Column({ type: 'enum', enum: ['diaria', 'semanal'], default: 'diaria' })
  frecuencia: 'diaria' | 'semanal';

  @Column({ type: 'datetime', nullable: true, name: 'ultima_ejecucion' })
  ultima_ejecucion: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;
}
