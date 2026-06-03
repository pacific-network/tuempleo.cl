import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    Index,
} from 'typeorm';

/**
 * Registro de canje de un cupón por una empresa.
 * El índice único evita que la misma empresa canjee el mismo cupón dos veces.
 */
@Entity('cupon_canje')
@Index('uq_cupon_empresa', ['cupon_id', 'empresa_id'], { unique: true })
export class CuponCanje {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'int' })
    cupon_id: number;

    @Column({ type: 'int' })
    empresa_id: number;

    // userId del empleador que ejecutó el canje
    @Column({ type: 'int', nullable: true })
    usuario_id: number | null;

    @CreateDateColumn({ name: 'fecha' })
    fecha: Date;
}
