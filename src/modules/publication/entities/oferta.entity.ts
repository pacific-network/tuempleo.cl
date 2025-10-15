import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('oferta')
export class Oferta {
  @PrimaryGeneratedColumn() id: number;
  @Column({ type: 'varchar', length: 255 }) titulo: string;

  @Column({ type: 'datetime' }) fecha_publicacion: Date;
  @Column({ type: 'int' }) duracion_publicacion: number;
  @Column({ type: 'tinyint', default: 1 }) es_activa: number;
  @Column({ type: 'datetime' }) fecha_cierre: Date;

  @Column({ type: 'text' }) data: string;

  @Column({ type: 'int', nullable: true }) empresa_id: number | null;
  @Column({ type: 'int', nullable: true }) empleador_id: number | null;

  @Column({ type: 'varchar', length: 32, default: 'published' }) status: string;
  @Column({ type: 'datetime', nullable: true }) review_until: Date | null;
  @Column({ type: 'datetime', nullable: true }) expires_at: Date | null;

  @Column({ type: 'tinyint', default: 1 }) preguntas_habilitadas: number;
  @Column({ type: 'int', nullable: true }) prioridad_busqueda: number | null;
  @Column({ type: 'tinyint', default: 0 }) recomendacion_perfiles: number;

  @Column({ type: 'longtext', nullable: true }) restricciones_json: string | null;
}
