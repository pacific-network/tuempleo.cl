import { Entity, PrimaryGeneratedColumn, Column, OneToMany, ManyToOne, JoinColumn } from "typeorm";
import { Planes } from "../plans/plans.entity";

@Entity('empresa')
export class Empresa {

    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'varchar', length: 255, unique: true, nullable: false, default: '' })
    rut: string;

    @Column({ type: 'varchar', length: 255, nullable: false })
    razon_social: string;

    @Column({ type: 'varchar', length: 255, nullable: false })
    nombre_fantasia: string;

    @Column({ type: 'json', nullable: false })
    data: Record<string, any>;

    @ManyToOne(() => Planes, (plan) => plan.empresa, { nullable: true, onDelete: 'SET NULL' })
    @JoinColumn({ name: 'plan_id' })
    plan: Planes;

    @Column({ type: 'varchar', length: 1000, nullable: true })
    logo_url: string;  // Campo para el logo

    // Dato no visibles 
    @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
    fecha_creacion: Date;

    @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
    fecha_update: Date;

    @Column({ type: 'int', nullable: true })
    modificado_por: number;

}
