import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    UpdateDateColumn,
} from 'typeorm';

/**
 * Almacén genérico clave/valor para configuración global del sistema.
 * El valor se guarda como texto (puede ser JSON serializado).
 */
@Entity('system_config')
export class SystemConfig {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'varchar', length: 100, unique: true })
    clave: string;

    @Column({ type: 'text' })
    valor: string;

    @Column({ type: 'varchar', length: 255, nullable: true })
    descripcion: string | null;

    // userId del admin que modificó por última vez; null = sistema/seed
    @Column({ type: 'int', nullable: true })
    updated_by: number | null;

    @UpdateDateColumn({ name: 'updated_at' })
    updated_at: Date;
}
