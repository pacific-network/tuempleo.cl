import { Entity, PrimaryGeneratedColumn, Column, ManyToMany, JoinColumn, ManyToOne } from "typeorm";
import { Empresa } from "../business/business.entity";
import { Empleador } from "../employer/employer.entity";


@Entity("oferta")
export class Oferta {

    @PrimaryGeneratedColumn()
    id: number;

    @Column({ name: "titulo" })
    titulo: string;

    @ManyToOne(() => Empresa, empresa => empresa.ofertas)
    @JoinColumn({ name: "empresa_id" })
    empresa: Empresa; // vincuarlo a la empresa para saber de quien es la oferta 

    @ManyToOne(() => Empleador, empleador => empleador.ofertas)
    @JoinColumn({ name: "empleador_id" })
    empleador: Empleador;  // vincularlo a la tabla usuario o empleador?  es para saber quien lo publico 

    // @Column({ type: "varchar", length: 255 })
    // publicado_por: Empleador;

    @Column({ type: "datetime" })
    fecha_publicacion: Date;

    @Column({ type: "int" })
    duracion_publicacion: number;

    @Column({ type: 'boolean', default: true })
    es_activa: boolean;

    @Column({ type: "datetime" })
    fecha_cierre: Date;

    @Column({ type: 'text' })
    data: string;


}