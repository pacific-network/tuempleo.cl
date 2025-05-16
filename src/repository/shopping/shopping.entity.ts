import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    CreateDateColumn,
    JoinColumn,
} from "typeorm";
import { Usuario } from "../user/user.entity";
import { Empresa } from "../business/business.entity";
import { Planes } from "../plans/plans.entity";

@Entity("shopping_cart")
export class ShoppingCart {
    @PrimaryGeneratedColumn("uuid")
    id: string;

    @ManyToOne(() => Planes, { eager: true })
    @JoinColumn({ name: "plan_id" })
    plan: Planes;

    @Column({ nullable: false })
    plan_id: string;

    @ManyToOne(() => Usuario, { eager: true })
    @JoinColumn({ name: "usuario_id" })
    usuario: Usuario;

    @Column({ nullable: false })
    usuario_id: string;

    @ManyToOne(() => Empresa, { eager: true })
    @JoinColumn({ name: "empresa_id" })
    empresa: Empresa;

    @Column({ nullable: false })
    empresa_id: string;

    @Column("decimal", { nullable: false })
    precio: number;

    @Column({ default: false })
    pagado: boolean;

    @CreateDateColumn({ name: "fecha_orden" })
    fecha_orden: Date;
}
