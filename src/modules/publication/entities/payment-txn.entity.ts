import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('transactions')
export class PaymentTxn {
  @PrimaryColumn({ name: 'id', type: 'varchar', length: 36 })
  id: string;

  @Column({ name: 'orderId', type: 'varchar', length: 255 })
  orderId: string;

  @Column({ name: 'sessionId', type: 'varchar', length: 255 })
  sessionId: string;

  @Column({ name: 'amount', type: 'decimal', precision: 10, scale: 0 })
  amount: string;

  @Column({ name: 'status', type: 'varchar', length: 255, nullable: true })
  status: string | null;

  @Column({ name: 'response_data', type: 'longtext', nullable: true })
  responseData: string | null;
}
