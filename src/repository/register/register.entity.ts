import { Entity, PrimaryColumn, Column, CreateDateColumn, PrimaryGeneratedColumn } from 'typeorm'
import { Exclude } from 'class-transformer'

@Entity('registro')
export class Registro {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'varchar', length: 255, nullable: false })
    nombre_completo: string;

    @Exclude()
    @Column({ type: 'varchar', length: 255, nullable: false })
    password: string;


    @Column({ type: 'varchar', length: 255, nullable: false, unique: true })
    email: string;

    @Column({ type: 'boolean', nullable: false })
    es_activo: boolean;

    @CreateDateColumn({ type: 'datetime' })
    fecha_creacion: Date;
}

