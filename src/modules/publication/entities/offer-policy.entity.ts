import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('offer_policy')
export class OfferPolicy {
  @PrimaryGeneratedColumn()
  id: number;

  @Index({ unique: true })
  @Column({ name: 'oferta_id', type: 'int' })
  ofertaId: number;

  @Index()
  @Column({ name: 'employer_id', type: 'int' })
  employerId: number;

  @Column({ name: 'plan_key', type: 'varchar', length: 20 })
  planKey: string;

  @Column({ name: 'policy_json', type: 'json' })
  policyJson: any;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
