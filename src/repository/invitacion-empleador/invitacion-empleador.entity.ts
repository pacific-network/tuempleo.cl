import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Empresa } from '../business/business.entity';
import { Empleador } from '../employer/employer.entity';

@Entity('invitacion_empleador')
export class InvitacionEmpleador {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 6, unique: true })
  codigo: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  telefono: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email: string | null;

  @ManyToOne(() => Empresa, { nullable: false })
  @JoinColumn({ name: 'empresa_id' })
  empresa: Empresa;

  @ManyToOne(() => Empleador, { nullable: false })
  @JoinColumn({ name: 'invitado_por' })
  invitadoPor: Empleador;

  @Column({
    type: 'enum',
    enum: ['pendiente', 'aceptada', 'expirada'],
    default: 'pendiente',
  })
  estado: 'pendiente' | 'aceptada' | 'expirada';

  @CreateDateColumn()
  createdAt: Date;

  @Column({ type: 'datetime' })
  expiraEn: Date;
}
