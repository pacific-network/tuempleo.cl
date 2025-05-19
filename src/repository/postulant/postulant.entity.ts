import { Entity, PrimaryGeneratedColumn, Column, JoinColumn, OneToOne } from 'typeorm';
import { Usuario } from '../user/user.entity';

@Entity('postulante')
export class Postulante {
    @PrimaryGeneratedColumn()
    id: number;

    @OneToOne(() => Usuario, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'usuario_id' })
    usuario: Usuario;

    @Column({ type: 'json', nullable: false })
    data: Record<string, any>;

    @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
    fecha_update: Date;

    @Column({ type: 'int', nullable: true })
    modificado_por: number;;


}
