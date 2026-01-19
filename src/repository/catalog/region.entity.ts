import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    OneToMany,
} from 'typeorm'
import { Comuna } from './commune.entity'

@Entity({ name: 'region' })
export class Region {
    @PrimaryGeneratedColumn()
    id: number

    @Column({ unique: true })
    nombre: string

    @Column()
    zona: string // norte_grande | norte_chico | centro | sur | austral

    @Column({ default: true })
    activo: boolean

    @Column({ default: 0 })
    orden: number

    @OneToMany(() => Comuna, (comuna) => comuna.region)
    comunas: Comuna[]
}
