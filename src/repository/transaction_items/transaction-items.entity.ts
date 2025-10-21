
import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    JoinColumn,
    ManyToOne,
} from "typeorm";
import { Transaction } from "../transaction/transaction.entity";

@Entity('transaction_items')
export class TransactionItem {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => Transaction, (t) => t.items)
    @JoinColumn({ name: 'transaction_id' })
    transaction: Transaction;

    @Column({ type: 'enum', enum: ['BASICO', 'ESTANDAR', 'PREMIUM'], nullable: false })
    tipoAviso: 'BASICO' | 'ESTANDAR' | 'PREMIUM';

    @Column({ type: 'int', default: 1 })
    cantidad: number;

    @Column('decimal', { nullable: false })
    precioUnitario: number;

    @Column('decimal', { nullable: false })
    subtotal: number;

    @CreateDateColumn({ type: 'datetime', name: 'created_at' })
    createdAt: Date;
}
