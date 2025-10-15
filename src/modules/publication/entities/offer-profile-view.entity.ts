import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, Unique } from 'typeorm';

@Entity('offer_profile_view')
@Unique('uq_offer_view', ['ofertaId', 'employerId', 'postulanteId'])
export class OfferProfileView {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column({ name: 'oferta_id', type: 'int' })
  ofertaId: number;

  @Index()
  @Column({ name: 'employer_id', type: 'int' })
  employerId: number;

  @Column({ name: 'postulante_id', type: 'int' })
  postulanteId: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
