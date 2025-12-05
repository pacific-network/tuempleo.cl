// src/repository/stock/stock-gratis.entity.ts
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

@Entity('stock_gratis')
export class StockGratis {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => Empresa)
    @JoinColumn({ name: 'empresa_id' })
    empresa: Empresa;

    @Column({ type: 'int', default: 3 })
    cantidad_disponible: number;

    // Guardamos el mes y año para saber cuándo resetear
    @Column({ type: 'int' })
    mes: number;

    @Column({ type: 'int' })
    anio: number;

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;
}
