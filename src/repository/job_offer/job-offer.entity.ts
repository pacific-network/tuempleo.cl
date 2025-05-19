import { Entity, PrimaryGeneratedColumn, Column, ManyToMany, JoinColumn, ManyToOne } from "typeorm";
import { Empresa } from "../business/business.entity";
import { Usuario } from "../user/user.entity";


@Entity("oferta")
export class Oferta {

    @PrimaryGeneratedColumn()
    id: number;

    @Column({ name: "titulo" })
    titulo: string;

    // @ManyToOne(() => Empresa, empresa => empresa.ofertas)
    // @JoinColumn({ name: "empresa_id" })
    // empresa: Empresa;

    // @ManyToOne(() => Usuario, usuario => usuario.ofertas)
    // @JoinColumn({ name: "usuario_id" })
    // usuario: Usuario;

    @Column({ type: "varchar", length: 255 })
    publicado_por: Usuario;

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