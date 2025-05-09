import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Rol } from 'src/repository/role/role.entity';

@Entity('usuario')
export class Usuario {
    @PrimaryGeneratedColumn()
    id: number;

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

    // Relación ManyToOne con la entidad Rol
    @ManyToOne(() => Rol, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'rol_id' })  // Especifica el nombre de la columna
    rol: Rol;
}
