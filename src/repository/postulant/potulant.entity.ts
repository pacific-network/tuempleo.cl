import { Entity, PrimaryGeneratedColumn, Column, Unique, JoinColumn, OneToOne } from 'typeorm';
import { Usuario } from '../user/user.entity';

@Entity('postulante')
export class Postulante {
    @PrimaryGeneratedColumn()
    id: number;

    @OneToOne(() => Usuario, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'usuario_id' })
    usuario: Usuario;

    @Column({ type: 'varchar', length: 12, unique: true })
    rut: string;

    @Column({ type: 'json', nullable: false })
    data: Record<string, any>;
}
