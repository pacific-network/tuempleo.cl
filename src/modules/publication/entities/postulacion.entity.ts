import { Entity, PrimaryGeneratedColumn, Column, Index } from 'typeorm';

@Entity('postulacion')
export class Postulacion {
  @PrimaryGeneratedColumn() id: number;

  @Column({ name: 'fecha_postulacion', type: 'datetime' }) fecha_postulacion: Date;
  @Index() @Column({ name: 'postulante_id', type: 'int' }) postulante_id: number;
  @Index('FK_560936481bf4d23af521b06ae9d') @Column({ name: 'oferta_id', type: 'int' }) oferta_id: number;
}
