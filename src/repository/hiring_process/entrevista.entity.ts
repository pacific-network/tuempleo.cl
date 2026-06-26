import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  JoinColumn,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Empleador } from '../employer/employer.entity';
import { Postulacion } from '../applications/applications.entity';

@Entity('entrevista')
export class Entrevista {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Postulacion, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'postulacion_id' })
  postulacion: Postulacion;

  @ManyToOne(() => Empleador, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'creado_por' })
  creadoPor: Empleador | null;

  // 📅 Fecha/hora propuesta para la entrevista
  @Column({ type: 'datetime' })
  fecha_propuesta: Date;

  // ⏱️ Duración estimada en minutos
  @Column({ type: 'int', default: 30, nullable: true })
  duracion_min: number;

  // 📞 Cómo se contactará al candidato. El empleador define el medio;
  // no integramos herramientas de videollamada (ver detalle_contacto).
  @Column({
    type: 'enum',
    enum: ['presencial', 'telefonica', 'videollamada', 'otro'],
    default: 'presencial',
  })
  modalidad_contacto: 'presencial' | 'telefonica' | 'videollamada' | 'otro';

  // 🔗 Dirección, teléfono o link de video que el empleador pega manualmente.
  @Column({ type: 'text', nullable: true })
  detalle_contacto: string | null;

  // 💬 Instrucciones / mensaje para el candidato.
  @Column({ type: 'text', nullable: true })
  mensaje: string | null;

  @Column({
    type: 'enum',
    enum: ['propuesta', 'confirmada', 'reprogramada', 'cancelada', 'completada'],
    default: 'propuesta',
  })
  estado: 'propuesta' | 'confirmada' | 'reprogramada' | 'cancelada' | 'completada';

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
