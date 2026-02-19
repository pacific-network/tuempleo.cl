import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { Rol } from 'src/repository/role/role.entity';
import { Curriculum } from 'src/repository/curriculum/curriculum.entity';

@Entity('usuario')
export class Usuario {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'varchar', length: 255, unique: true, nullable: true })
    rut: string | null;

    @Column({ type: 'varchar', length: 255, nullable: false })
    nombres: string;

    @Column({ type: 'varchar', length: 255, nullable: false })
    apellidos: string;

    @Column({ type: 'varchar', length: 255, nullable: false })
    password: string;

    @Column({ type: 'varchar', length: 255, unique: true, nullable: false })
    email: string;

    @CreateDateColumn({ type: 'timestamp' })
    fecha_creacion: Date;

    @Column({ type: 'boolean', default: true })
    is_activo: boolean;

    @Column({ type: 'boolean', default: false })
    isAdmin: boolean;

    /**
 * ⚠️ LEGACY
 * Este campo NO debe usarse para autorización ni contexto.
 * Se mantiene solo por compatibilidad y migración.
 */
    @ManyToOne(() => Rol, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'rol_id' })
    rol: Rol;

    @Column({ type: 'int', nullable: true })
    id_empresa: number | null; // ID de la empresa asociada, si aplica

    @Column({ type: 'varchar', length: 500, nullable: true })
    perfil_foto: string | null; // URL de la foto de perfil

    // Relación con Curriculum
    @OneToMany(() => Curriculum, (curriculum) => curriculum.usuario)
    curriculums: Curriculum[];
}