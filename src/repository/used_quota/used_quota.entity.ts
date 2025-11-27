import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne } from "typeorm";


@Entity('used_quota')
export class CuposUsados {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'int' })
    empresa_id: number;

    @Column({ type: 'int' })
    oferta_id: number;

    @Column({ type: 'int' })
    usuario_id: number;

    @Column({ type: 'varchar', length: 20 })
    action: string; // view | download

    @Column({ type: 'int', default: 0 })
    count: number;  // 👈 contador acumulado

    @CreateDateColumn({ type: 'datetime' })
    created_at: Date;
}
