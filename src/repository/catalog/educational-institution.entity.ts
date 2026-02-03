import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
} from 'typeorm'

export type EducationalInstitutionType =
    | 'universidad'
    | 'instituto_profesional'
    | 'cft'
    | 'internacional'
    | 'otra'

@Entity({ name: 'institucion_educacional' })
export class InstitucionEducacional {
    @PrimaryGeneratedColumn()
    id: number

    @Column({ unique: true })
    nombre: string

    @Column({
        type: 'enum',
        enum: [
            'universidad',
            'instituto_profesional',
            'cft',
            'internacional',
            'otra',
        ],
    })
    tipo: EducationalInstitutionType

    @Column({ default: true })
    activo: boolean

    @CreateDateColumn()
    created_at: Date
}
