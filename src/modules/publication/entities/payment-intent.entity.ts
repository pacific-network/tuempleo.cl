import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, Unique } from 'typeorm';

export type PaymentStatus = 'CREATED' | 'AUTHORIZED' | 'FAILED';
export type PaymentTipo = 'OFERTA' | 'PACK';

@Entity('payment_intents')
@Unique('orderId', ['orderId'])
export class PaymentIntent {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'orderId', type: 'varchar', length: 255 })
  orderId: string;

  @Index('idx_pi_session')
  @Column({ name: 'sessionId', type: 'varchar', length: 255 })
  sessionId: string;

  @Index('idx_pi_empresa')
  @Column({ name: 'empresa_id', type: 'int' })
  empresaId: number;

  @Column({ name: 'tipo', type: 'enum', enum: ['OFERTA', 'PACK'] })
  tipo: PaymentTipo;

  @Column({ name: 'plan_id', type: 'int', nullable: true })
  planId: number | null;

  @Column({ name: 'oferta_id', type: 'int', nullable: true })
  ofertaId: number | null;

  @Column({ name: 'amount_expected', type: 'decimal', precision: 10, scale: 0 })
  amountExpected: string;

  @Column({ name: 'discount_code_id', type: 'bigint', nullable: true })
  discountCodeId: string | null;

  @Column({ name: 'discount_amount', type: 'decimal', precision: 10, scale: 0, default: 0 })
  discountAmount: string;

  @Column({ name: 'status', type: 'enum', enum: ['CREATED', 'AUTHORIZED', 'FAILED'], default: 'CREATED' })
  status: PaymentStatus;

  @Column({ name: 'transaction_id', type: 'varchar', length: 36, nullable: true })
  transactionId: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'datetime' })
  createdAt: Date;
}
