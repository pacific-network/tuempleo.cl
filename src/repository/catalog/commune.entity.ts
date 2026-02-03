
import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    JoinColumn,
} from 'typeorm'
import { Region } from './region.entity'

@Entity({ name: 'comuna' })
export class Comuna {
    @PrimaryGeneratedColumn()
    id: number

    @Column()
    nombre: string

    @Column({ default: true })
    activo: boolean

    @Column({ default: 0 })
    orden: number

    @ManyToOne(() => Region, (region) => region.comunas)
    @JoinColumn({ name: 'region_id' })
    region: Region
}
