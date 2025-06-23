import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Unique,
} from 'typeorm';
import { Postulante } from '../../repository/postulant/postulant.entity';
import { Oferta } from '../../repository/job_offer/job-offer.entity';

@Entity('postulacion')
@Unique(['postulante', 'oferta']) // corregido: era "usuario"
export class Postulacion {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Postulante, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'postulante_id' })
  postulante: Postulante;

  @ManyToOne(() => Oferta, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'oferta_id' })
  oferta: Oferta;

  @CreateDateColumn({ name: 'fecha_postulacion' })
  fechaPostulacion: Date;

  @Column({ type: 'json', nullable: true })
  data: Record<string, any>;

  @Column({
    type: 'enum',
    enum: ['enviada', 'vista', 'en_revision', 'preseleccionado', 'no_seleccionado', 'cancelada'],
    default: 'enviada',
  })
  estado: 'enviada' | 'vista' | 'en_revision' | 'preseleccionado' | 'no_seleccionado' | 'cancelada';

}
