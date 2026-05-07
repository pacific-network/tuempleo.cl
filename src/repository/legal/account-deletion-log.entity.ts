import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('account_deletion_log')
export class AccountDeletionLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 64 })
  email_hash: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  rut_hash: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  reason: string | null;

  @CreateDateColumn()
  deleted_at: Date;
}
