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

    /**
     * Baja lógica. Se usa cuando el único miembro de la empresa elimina su
     * cuenta: la empresa no puede quedar viva sin nadie a cargo, pero tampoco
     * se puede borrar — hay ofertas, transacciones y cupos apuntándole, y el
     * DELETE duro falla por FK (además de que los datos contables no se
     * eliminan a pedido).
     */
    @Column({ type: 'boolean', default: true })
    es_activa: boolean;

    @Column({ type: 'datetime', nullable: true })
    fecha_baja: Date | null;

    // Dato no visibles
    @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
    fecha_creacion: Date;

    @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
    fecha_update: Date;

    @Column({ type: 'int', nullable: true })
    modificado_por: number;

}
