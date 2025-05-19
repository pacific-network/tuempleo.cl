import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    JoinColumn,
    OneToOne,
    ManyToOne,
  } from 'typeorm';
  import { Usuario } from '../user/user.entity';
  import { Empresa } from '../business/business.entity';
  
  @Entity('empleador')
  export class Empleador {
    @PrimaryGeneratedColumn()
    id: number;
  
    @OneToOne(() => Usuario, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'usuario_id' })
    usuario: Usuario;
  
    @ManyToOne(() => Empresa, { nullable: false })
    @JoinColumn({ name: 'empresa_id' })
    empresa: Empresa;
  
    @Column({ type: 'json', nullable: false })
    data: Record<string, any>;
  
    @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
    fecha_update: Date;
  
    @Column({ type: 'int', nullable: true })
    modificado_por: number;
  }
  