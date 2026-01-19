import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
} from 'typeorm'

@Entity({ name: 'actividad_empresa' })
export class BusinessActivity {
    @PrimaryGeneratedColumn()
    id: number

    @Column({ unique: true })
    nombre: string

    @Column({ default: true })
    activo: boolean

    @CreateDateColumn()
    created_at: Date
}
