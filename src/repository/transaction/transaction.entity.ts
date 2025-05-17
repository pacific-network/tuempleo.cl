// repuesta web pay

import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
} from "typeorm";

@Entity("transactions")
export class Transaction {
    @PrimaryGeneratedColumn("uuid")
    id: string;

    @Column({ nullable: false })
    orderId: string;

    @Column({ nullable: false })
    sessionId: string;

    @Column("decimal", { nullable: false })
    amount: number;

    @Column({ nullable: true })
    token: string;

    @Column({ nullable: true })
    status: string;

    @Column({ type: "json", nullable: true })
    response_data: object;

    @CreateDateColumn()
    created_at: Date;
}
