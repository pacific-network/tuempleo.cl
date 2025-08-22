import {
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Unique,
} from 'typeorm';
import { Oferta } from '../job_offer/job-offer.entity';
import { Postulante } from '../postulant/postulant.entity';

@Entity('trabajos_guardados')
@Unique(['postulante', 'oferta'])
export class TrabajoGuardado {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Postulante, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({ name: 'postulante_id' })
  postulante: Postulante;

  @ManyToOne(() => Oferta, { onDelete: 'CASCADE', nullable: false, eager: true })
  @JoinColumn({ name: 'oferta_id' })
  oferta: Oferta;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;
}
