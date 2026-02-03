import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
} from 'typeorm'

@Entity({ name: 'area_trabajo' })
export class WorkArea {
    @PrimaryGeneratedColumn()
    id: number

    @Column({ unique: true })
    nombre: string

    @Column({ default: true })
    activo: boolean

    @CreateDateColumn()
    created_at: Date
}
