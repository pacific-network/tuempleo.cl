import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    Index,
} from 'typeorm'

export enum MailType {
    PASSWORD_RESET = 'PASSWORD_RESET',
    STATUS_NOTIFICATION = 'STATUS_NOTIFICATION',
    PROMOTIONAL = 'PROMOTIONAL',
}

export enum MailOrigin {
    SYSTEM = 'SYSTEM',
    EMPLOYER = 'EMPLOYER',
    PLATFORM = 'PLATFORM',
}

export enum MailStatus {
    PENDING = 'PENDING',
    SENT = 'SENT',
    FAILED = 'FAILED',
    DELIVERED = 'DELIVERED',
    UNSUBSCRIBED = 'UNSUBSCRIBED',
}

@Entity('mail')
export class Mail {
    @PrimaryGeneratedColumn('uuid')
    id: string

    @Column({ type: 'enum', enum: MailType })
    type: MailType

    @Column({ type: 'enum', enum: MailOrigin })
    origin: MailOrigin

    @Index()
    @Column({ length: 255 })
    toEmail: string

    @Column({ length: 100 })
    templateId: string

    @Column({ type: 'json', nullable: true })
    payload: Record<string, any> | null

    @Column({
        type: 'enum',
        enum: MailStatus,
        default: MailStatus.PENDING,
    })
    status: MailStatus

    @Index()
    @Column({ type: 'varchar', length: 100, nullable: true })
    providerId: string | null

    @Column({ type: 'varchar', length: 100, nullable: true })
    errorCode: string | null

    @CreateDateColumn()
    createdAt: Date

    @UpdateDateColumn()
    updatedAt: Date
}

