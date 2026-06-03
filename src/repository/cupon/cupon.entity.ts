import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
} from 'typeorm';

/** Una línea del cupón: cuántos avisos de qué tipo otorga. */
export interface CuponLinea {
    tipoAviso: 'BASICO' | 'ESTANDAR' | 'PREMIUM';
    cantidad: number;
}

/**
 * Cupón canjeable: el admin define su contenido (mezcla de tipos de aviso)
 * y se genera un código. Una empresa lo canjea y se le activan las promos.
 */
@Entity('cupon')
export class Cupon {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'varchar', length: 50, unique: true })
    codigo: string;

    @Column({ type: 'varchar', length: 150 })
    nombre: string;

    // Contenido: [{ tipoAviso: 'ESTANDAR', cantidad: 2 }, { tipoAviso: 'PREMIUM', cantidad: 1 }]
    @Column({ type: 'json' })
    lineas: CuponLinea[];

    // Vigencia de las promos generadas, en días desde el canje.
    @Column({ type: 'int', default: 30 })
    dias_vigencia: number;

    // Hasta cuándo se puede canjear el cupón; null = sin límite de fecha.
    @Column({ type: 'datetime', nullable: true })
    fecha_expiracion: Date | null;

    // Tope de canjes: null = ilimitado · 1 = un solo uso · N = campaña.
    @Column({ type: 'int', nullable: true })
    max_usos: number | null;

    @Column({ type: 'int', default: 0 })
    usos_actuales: number;

    @Column({ type: 'boolean', default: true })
    activo: boolean;

    // userId del admin que creó el cupón
    @Column({ type: 'int', nullable: true })
    created_by: number | null;

    @CreateDateColumn({ name: 'created_at' })
    created_at: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updated_at: Date;
}
