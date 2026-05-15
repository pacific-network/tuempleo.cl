import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    JoinColumn,
    Index,
} from 'typeorm';
import { Usuario } from 'src/repository/user/user.entity';

export type BugStatus = 'abierto' | 'en_revision' | 'resuelto' | 'no_se_corrige';

@Entity('bugs')
@Index(['status'])
export class Bug {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'int', nullable: true, name: 'usuario_id' })
    usuarioId: number | null;

    @ManyToOne(() => Usuario, { onDelete: 'SET NULL', nullable: true })
    @JoinColumn({ name: 'usuario_id' })
    usuario: Usuario | null;

    @Column({ type: 'varchar', length: 255 })
    titulo: string;

    @Column({ type: 'text' })
    descripcion: string;

    @Column({ type: 'varchar', length: 500 })
    pagina: string;

    @Column({ type: 'varchar', length: 500, nullable: true, name: 'user_agent' })
    userAgent: string | null;

    @Column({
        type: 'enum',
        enum: ['abierto', 'en_revision', 'resuelto', 'no_se_corrige'],
        default: 'abierto',
    })
    status: BugStatus;

    @Column({ type: 'text', nullable: true, name: 'notas_internas' })
    notasInternas: string | null;

    @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ type: 'timestamp', name: 'updated_at' })
    updatedAt: Date;
}
