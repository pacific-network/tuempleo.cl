import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Unique,
} from 'typeorm';
import { Postulante } from '../../repository/postulant/postulant.entity';
import { Oferta } from '../../repository/job_offer/job-offer.entity';

export type CierreMotivo =
  | 'oferta_expirada'
  | 'vacante_completada'
  | 'oferta_eliminada'
  | 'inactividad';

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

  // Último movimiento real de la postulación. Es la base del cierre por
  // inactividad; NULL en las filas anteriores a la migración de cierre.
  @UpdateDateColumn({ name: 'fecha_actualizacion', nullable: true })
  fechaActualizacion: Date | null;

  @Column({ type: 'json', nullable: true })
  data: Record<string, any>;

  @Column({
    type: 'enum',
    enum: ['enviada', 'vista', 'en_revision', 'cualificado', 'preseleccionado', 'seleccionado', 'no_seleccionado', 'cancelada', 'contratado'],
    default: 'enviada',
  })
  estado: 'enviada' | 'vista' | 'en_revision' | 'cualificado' | 'preseleccionado' | 'seleccionado' | 'no_seleccionado' | 'cancelada' | 'contratado';

  // ── Cierre de la postulación ────────────────────────────────
  // El estado no alcanza para explicarle al candidato qué pasó: un
  // 'no_seleccionado' puede ser un descarte real o una oferta que expiró.
  // El motivo es lo que hace que el mensaje de cierre sea honesto.
  @Column({
    type: 'enum',
    enum: ['oferta_expirada', 'vacante_completada', 'oferta_eliminada', 'inactividad'],
    name: 'cierre_motivo',
    nullable: true,
  })
  cierreMotivo: CierreMotivo | null;

  @Column({ type: 'datetime', name: 'fecha_cierre', nullable: true })
  fechaCierre: Date | null;

  @Column({ type: 'boolean', name: 'cierre_automatico', default: false })
  cierreAutomatico: boolean;

  // Sello de notificación: garantiza que el candidato reciba el aviso una
  // sola vez, aunque el cron vuelva a pasar por la misma postulación.
  @Column({ type: 'datetime', name: 'cierre_notificado_at', nullable: true })
  cierreNotificadoAt: Date | null;
}
