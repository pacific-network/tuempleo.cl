import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Usuario } from '../user/user.entity';

export enum AlertAudiencia {
  TODOS = 'TODOS',
  POSTULANTES = 'POSTULANTES',
  EMPLEADORES = 'EMPLEADORES',
  ADMINS = 'ADMINS',
}

@Entity('system_alert')
export class SystemAlert {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 200 })
  titulo: string;

  @Column({ type: 'text' })
  mensaje: string;

  @Column({
    type: 'enum',
    enum: AlertAudiencia,
    default: AlertAudiencia.TODOS,
  })
  audiencia: AlertAudiencia;

  @Column({ type: 'boolean', default: true })
  activa: boolean;

  @Column({ type: 'datetime', nullable: true, name: 'fecha_inicio' })
  fecha_inicio: Date | null;

  @Column({ type: 'datetime', nullable: true, name: 'fecha_fin' })
  fecha_fin: Date | null;

  @ManyToOne(() => Usuario, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'created_by' })
  created_by: Usuario | null;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;
}
