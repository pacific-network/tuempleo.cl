import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  JoinColumn,
  ManyToOne,
  Index,
} from 'typeorm';
import { Usuario } from '../user/user.entity';
import { Empresa } from '../business/business.entity';

/**
 * Membresía de una persona en una empresa.
 *
 * Una misma persona puede tener varias filas — una por empresa — y su rol vive
 * en la membresía, no en la persona: se puede ser `admin` (el responsable main)
 * en una empresa y `miembro` (colaborador) en otra.
 *
 * El índice único sobre (usuario_id, empresa_id) reemplaza al UNIQUE que había
 * sobre usuario_id solo: impide membresías duplicadas sin limitar cuántas
 * empresas puede administrar una persona.
 */
@Entity('empleador')
@Index('uq_empleador_usuario_empresa', ['usuario', 'empresa'], { unique: true })
export class Empleador {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Usuario, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'usuario_id' })
  usuario: Usuario;

  @ManyToOne(() => Empresa, { nullable: false })
  @JoinColumn({ name: 'empresa_id' })
  empresa: Empresa;

  @Column({ type: 'int', nullable: true })
  ofertas: number;

  @Column({
    type: 'enum',
    enum: ['empleador', 'colaborador'],
    default: 'empleador',
  })
  rol_empresa: 'empleador' | 'colaborador';

  @Column({ type: 'json', nullable: false })
  data: Record<string, any>;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  fecha_update: Date;

  @Column({ type: 'int', nullable: true })
  modificado_por: number;
}
