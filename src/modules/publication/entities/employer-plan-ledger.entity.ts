import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, Unique } from 'typeorm';

export type LedgerStatus = 'RESERVED' | 'CONFIRMED' | 'CANCELLED';

@Entity('employer_plan_ledger')
@Unique('uq_epl_buy_order', ['buyOrder'])
@Unique('uq_epl_order', ['orderId'])
export class EmployerPlanLedger {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column({ name: 'employer_id', type: 'int' })
  employerId: number;

  @Index()
  @Column({ name: 'plan_key', type: 'varchar', length: 20 })
  planKey: string; // FREE | BASICO | ESTANDAR | PREMIUM

  @Column({ name: 'qty', type: 'int', default: 1 })
  qty: number;

  @Index()
  @Column({ name: 'status', type: 'varchar', length: 12, default: 'RESERVED' })
  status: LedgerStatus;

  @Index()
  @Column({ name: 'oferta_id', type: 'int', nullable: true })
  ofertaId: number | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'buy_order', type: 'varchar', length: 128, nullable: true })
  buyOrder: string | null;

  @Column({ name: 'order_id', type: 'varchar', length: 255, nullable: true })
  orderId: string | null;
}
