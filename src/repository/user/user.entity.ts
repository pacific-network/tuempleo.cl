import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('usuario')
export class Usuario {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'varchar', length: 12, unique: true, nullable: false })
    rut: string;

    @Column({ type: 'varchar', length: 255, unique: true, nullable: false })
    nombre_usuario: string;

    @Column({ type: 'varchar', length: 255, nullable: false })
    password: string;

    @Column({ type: 'varchar', length: 255, nullable: true })
    direccion: string;

    @Column({ type: 'varchar', length: 15, nullable: true })
    telefono: string;

    @Column({ type: 'varchar', length: 255, unique: true, nullable: true })
    mail: string;

    @Column({ type: 'varchar', length: 50, nullable: true })
    rol: string;

    @CreateDateColumn({ type: 'datetime' })
    fecha_creacion: Date;

    @Column({ type: 'boolean', default: true })
    is_activo: boolean;
}