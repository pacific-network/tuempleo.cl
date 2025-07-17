import { Entity, PrimaryGeneratedColumn, Column, JoinColumn, ManyToOne, CreateDateColumn } from "typeorm";
import { Empleador } from "../employer/employer.entity";
import { Postulacion } from "../applications/applications.entity";

@Entity('proceso_seleccion')
export class ProcesoSeleccion {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => Postulacion, { nullable: false, onDelete: 'CASCADE' })
    @JoinColumn({ name: 'postulacion_id' })
    postulacion: Postulacion;

    @ManyToOne(() => Empleador, { nullable: true, onDelete: 'SET NULL' })
    @JoinColumn({ name: 'gestor_id' })
    gestor: Empleador;

    @Column({
        type: 'enum',
        enum: ['preseleccionado', 'descartado', 'contratado'],
        default: 'preseleccionado',
    })
    estado: 'preseleccionado' | 'descartado' | 'contratado';

    @Column({ type: 'text', nullable: true })
    observaciones: string;

    @CreateDateColumn()
    fecha: Date;
}
