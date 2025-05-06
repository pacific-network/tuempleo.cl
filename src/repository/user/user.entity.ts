import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

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

    @Column({ type: 'varchar', length: 50, nullable: true })
    rol: string;

    @CreateDateColumn({ type: 'timestamp' })
    fecha_creacion: Date;

    @Column({ type: 'boolean', default: true })
    is_activo: boolean;
}
