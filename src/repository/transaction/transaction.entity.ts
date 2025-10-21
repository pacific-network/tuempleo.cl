// repuesta web pay

import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    OneToMany,
} from "typeorm";
import { TransactionItem } from "../transaction_items/transaction-items.entity";

@Entity('transactions')
export class Transaction {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ nullable: false })
    orderId: string;

    @Column({ nullable: false })
    sessionId: string;

    @Column('decimal', { nullable: false })
    amount: number;

    @Column({ nullable: true })
    token: string;

    @Column({ nullable: true })
    status: string;

    @Column({ type: 'json', nullable: true })
    response_data: object;

    @CreateDateColumn({ type: 'datetime', name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ type: 'datetime', name: 'updated_at' })
    updatedAt: Date;

    // 🔹 Relación con los ítems
    @OneToMany(() => TransactionItem, (item) => item.transaction, {
        cascade: true,
    })
    items: TransactionItem[];
}

