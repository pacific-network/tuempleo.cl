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

    @Column({ type: 'int', nullable: true })
    ofertas: number;

    @ManyToOne(() => Planes, (plan) => plan.empresa, { nullable: true, onDelete: 'SET NULL' })
    @JoinColumn({ name: 'plan_id' })
    plan: Planes;



    @Column({ type: 'varchar', length: 1000, nullable: true })
    logo_url: string;  // Campo para el logo

    // ✅ Insignia de empresa verificada (vía SMS) para combatir ofertas fraudulentas.
    @Column({ type: 'boolean', default: false })
    verificada: boolean;

    @Column({ type: 'datetime', nullable: true })
    fecha_verificacion: Date | null;

    @Column({ type: 'varchar', length: 20, nullable: true })
    telefono_verificado: string | null;

    // Dato no visibles
    @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
    fecha_creacion: Date;

    @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
    fecha_update: Date;

    @Column({ type: 'int', nullable: true })
    modificado_por: number;

}
