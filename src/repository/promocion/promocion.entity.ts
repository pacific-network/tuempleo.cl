import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    JoinColumn,
    CreateDateColumn,
    UpdateDateColumn,
} from 'typeorm';
import { Empresa } from '../business/business.entity';

@Entity('promocion')
export class Promocion {
    @PrimaryGeneratedColumn()
    id: number;

    // CASCADE: la promoción de bienvenida se crea junto con la empresa, así que no
    // debe impedir borrarla (bloqueaba el rollback del onboarding).
    @ManyToOne(() => Empresa, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'empresa_id' })
    empresa: Empresa;

    @Column({
        type: 'enum',
        enum: ['BASICO', 'ESTANDAR', 'PREMIUM'],
        default: 'PREMIUM',
    })
    tipoAviso: 'BASICO' | 'ESTANDAR' | 'PREMIUM';

    @Column({ type: 'int', default: 3 })
    cantidad: number;

    @Column({ type: 'int', default: 0 })
    cantidad_usada: number;

    @Column({ type: 'datetime' })
    fecha_inicio: Date;

    @Column({ type: 'datetime' })
    fecha_fin: Date;

    @Column({
        type: 'enum',
        enum: ['AUTO_REGISTRO', 'EJECUTIVO', 'CUPON'],
        default: 'AUTO_REGISTRO',
    })
    origen: 'AUTO_REGISTRO' | 'EJECUTIVO' | 'CUPON';

    // userId de quien otorgó la promo; null = otorgada por el sistema
    @Column({ type: 'int', nullable: true })
    otorgada_por: number | null;

    // Cupón que originó esta promo (origen = CUPON); null en otros casos
    @Column({ type: 'int', nullable: true })
    cupon_id: number | null;

    @Column({ type: 'varchar', length: 500, nullable: true })
    motivo: string | null;

    @CreateDateColumn({ name: 'created_at' })
    created_at: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updated_at: Date;
}
