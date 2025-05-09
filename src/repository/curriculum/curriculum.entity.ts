import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Usuario } from '../user/user.entity';

@Entity('curriculum')
export class Curriculum {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => Usuario, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'rut' })
    usuario: Usuario;

    @Column({ type: 'varchar', length: 12, nullable: false })
    rut: string; // RUT del usuario asociado

    @Column({ type: 'jsonb', nullable: false })
    data: Record<string, any>; // Datos extraídos del currículum en formato JSON

    @Column({ type: 'varchar', length: 255, nullable: false })
    cv_file: string; // Ruta donde está almacenado el archivo

    @CreateDateColumn({ name: 'creado_en' })
    creado_en: Date; // Fecha de creación

    @UpdateDateColumn({ name: 'actualizado_en' })
    actualizado_en: Date; // Fecha de actualización
}
