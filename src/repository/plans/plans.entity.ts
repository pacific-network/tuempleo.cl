import { PrimaryGeneratedColumn, Column, Entity, CreateDateColumn, UpdateDateColumn } from "typeorm";

@Entity('planes')
export class Planes {
    @PrimaryGeneratedColumn()
    id:number;

    @Column({ type: 'varchar', length: 255, nullable: false })
    nombre: string;

    @Column({ type: 'json', length: 255, nullable: false })
    descripcion: Record<string, any>;

    @Column({ type: 'decimal', precision: 10, scale: 2, nullable: false })
    precio: number;

    @CreateDateColumn({type: 'datetime', nullable: false})
    fecha_creacion: Date;

    @UpdateDateColumn({type: 'datetime', nullable: false})
    fecha_update: Date;

    @Column({ type: 'int', nullable: true })
    modificado_por: number;


}
