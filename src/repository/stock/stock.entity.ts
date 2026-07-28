// src/repository/stock/stock.entity.ts
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

@Entity('stock')
export class Stock {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({
        type: 'enum',
        enum: ['BASICO', 'ESTANDAR', 'PREMIUM'],
        nullable: false,
    })
    tipoAviso: 'BASICO' | 'ESTANDAR' | 'PREMIUM';

    @Column({ type: 'int', name: 'cantidad_disponible', default: 0 })
    cantidad_disponible: number;

    // CASCADE: el stock nace con la empresa; no debe bloquear su borrado.
    @ManyToOne(() => Empresa, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'empresa_id' })
    empresa: Empresa;

    @CreateDateColumn({ name: 'created_at' })
    created_at: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updated_at: Date;
}
