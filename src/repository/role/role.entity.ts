import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('roles') // Nombre de la tabla
export class Rol {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ unique: true })
    nombre: string;

    @Column({ nullable: true })
    descripcion: string;
}
