import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
} from 'typeorm'

@Entity('sms_log')
export class Sms {
    @PrimaryGeneratedColumn()
    id: number

    // 📞 Destinatario
    @Column()
    number: string

    // 💬 Contenido enviado
    @Column('text')
    content: string

    // 🌐 ID devuelto por Pacific SMS
    @Column({ nullable: true })
    externalSmsId: string

    // 📦 Tipo de SMS
    @Column()
    tipo: 'TRANSACCIONAL' | 'MARKETING' | 'SISTEMA'

    // 📊 Estado del envío
    @Column()
    status: string

    @CreateDateColumn()
    createdAt: Date
}
