import { PrimaryGeneratedColumn, Column, Entity, CreateDateColumn, UpdateDateColumn, OneToMany } from "typeorm";
import { Empresa } from "../business/business.entity";

export enum PlanPriority {
    GRATIS = 0,
    BASICO = 1,
    ESTANDAR = 2,
    DESTACADO = 3,
    PREMIUM = 4,
}


@Entity('planes')
export class Planes {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'varchar', length: 255, nullable: false })
    nombre: string;

    @Column({ type: 'json', nullable: false })
    descripcion: Record<string, any>;

    @Column({ type: 'decimal', precision: 10, scale: 2, nullable: false })
    precio: number;

    @OneToMany(() => Empresa, (empresa) => empresa.plan)
    empresa: Empresa[];

    @Column({
        type: 'int',
        default: PlanPriority.GRATIS,
    })
    priority: PlanPriority;

    @Column({ type: 'int', default: 0 })
    cupos: number;

    @CreateDateColumn({ type: 'datetime', nullable: false })
    fecha_creacion: Date;

    @UpdateDateColumn({ type: 'datetime', nullable: false })
    fecha_update: Date;

    @Column({ type: 'int', nullable: true })
    modificado_por: number;


}
