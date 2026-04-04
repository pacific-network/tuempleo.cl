import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    OneToMany,
} from "typeorm";
import { TransactionItem } from "../transaction_items/transaction-items.entity";

// 🔹 Enum para identificar el origen del pago
export enum PaymentGateway {
    WEBPAY = 'WEBPAY',
    MERCADOPAGO = 'MERCADOPAGO',
    PAYKU = 'PAYKU',
    FLOW = 'FLOW',
}

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

    // 🔹 Nuevo campo: enum para identificar la pasarela de pago
    @Column({
        type: 'enum',
        enum: PaymentGateway,
        default: PaymentGateway.WEBPAY,
    })
    origen: PaymentGateway;

    @Column({ type: 'boolean', default: false })
    stock_processed: boolean;

    @CreateDateColumn({ type: 'datetime', name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ type: 'datetime', name: 'updated_at' })
    updatedAt: Date;

    @OneToMany(() => TransactionItem, (item) => item.transaction, {
        cascade: true,
    })
    items: TransactionItem[];
}
