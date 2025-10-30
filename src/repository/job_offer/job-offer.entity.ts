// src/repository/oferta/oferta.entity.ts
import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    JoinColumn,
    CreateDateColumn,
    UpdateDateColumn,
    DeleteDateColumn,
} from 'typeorm';
import { Empresa } from '../business/business.entity';
import { Empleador } from '../employer/employer.entity';

@Entity('oferta')
export class Oferta {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'varchar', length: 255 })
    titulo: string;

    @ManyToOne(() => Empresa, (empresa) => empresa.ofertas, { eager: false })
    @JoinColumn({ name: 'empresa_id' })
    empresa: Empresa;

    @ManyToOne(() => Empleador, (empleador) => empleador.ofertas, { eager: false })
    @JoinColumn({ name: 'empleador_id' })
    empleador: Empleador;

    /**
     * 🔹 Tipo de aviso que consume del stock
     * (BASICO | ESTANDAR | PREMIUM)
     */
    @Column({
        type: 'enum',
        enum: ['GRATIS', 'BASICO', 'ESTANDAR', 'PREMIUM'],
        default: 'GRATIS',
        nullable: false,
    })
    tipo_aviso: 'GRATIS' | 'BASICO' | 'ESTANDAR' | 'PREMIUM';

    @CreateDateColumn({ name: 'fecha_publicacion' })
    fecha_publicacion: Date;

    @Column({ type: 'int', default: 30 })
    duracion_publicacion: number; // días

    @Column({ type: 'boolean', default: true })
    es_activa: boolean;

    @Column({ type: 'datetime', nullable: true })
    fecha_cierre: Date;

    @Column({ type: 'text', nullable: true })
    data: string;

    @DeleteDateColumn({ name: 'fecha_eliminacion' })
    fecha_eliminacion: Date;

    @ManyToOne(() => Empleador, { nullable: true })
    @JoinColumn({ name: 'eliminada_por' })
    eliminada_por: Empleador;

    @ManyToOne(() => Empleador, { nullable: true })
    @JoinColumn({ name: 'modificada_por' })
    modificada_por: Empleador;
}
