import { PrimaryGeneratedColumn, Column, Entity, CreateDateColumn, UpdateDateColumn, OneToMany } from "typeorm";
import { Empresa } from "../business/business.entity";

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

    @CreateDateColumn({ type: 'datetime', nullable: false })
    fecha_creacion: Date;

    @UpdateDateColumn({ type: 'datetime', nullable: false })
    fecha_update: Date;

    @Column({ type: 'int', nullable: true })
    modificado_por: number;


}
