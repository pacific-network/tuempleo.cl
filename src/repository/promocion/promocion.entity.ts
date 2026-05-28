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

    @ManyToOne(() => Empresa)
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
        enum: ['AUTO_REGISTRO', 'EJECUTIVO'],
        default: 'AUTO_REGISTRO',
    })
    origen: 'AUTO_REGISTRO' | 'EJECUTIVO';

    // userId de quien otorgó la promo; null = otorgada por el sistema
    @Column({ type: 'int', nullable: true })
    otorgada_por: number | null;

    @Column({ type: 'varchar', length: 500, nullable: true })
    motivo: string | null;

    @CreateDateColumn({ name: 'created_at' })
    created_at: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updated_at: Date;
}
