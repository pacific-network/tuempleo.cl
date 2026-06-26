import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Empresa } from './business.entity';

@Entity('verificacion_empresa')
export class VerificacionEmpresa {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Empresa, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'empresa_id' })
  empresa: Empresa;

  @Column({ type: 'varchar', length: 20 })
  telefono: string;

  @Column({ type: 'varchar', length: 6 })
  codigo: string;

  @Column({
    type: 'enum',
    enum: ['pendiente', 'verificada', 'expirada'],
    default: 'pendiente',
  })
  estado: 'pendiente' | 'verificada' | 'expirada';

  @Column({ type: 'int', default: 0 })
  intentos: number;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ type: 'datetime' })
  expiraEn: Date;

  @Column({ type: 'datetime', nullable: true })
  verifiedAt: Date | null;
}
