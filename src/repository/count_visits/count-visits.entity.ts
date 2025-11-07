import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    JoinColumn,
    CreateDateColumn,
    Unique,
} from 'typeorm';
import { Oferta } from '../job_offer/job-offer.entity';

/**
 * 🧩 Entidad: CountVisit
 * Registra una visita única por usuario logueado a una oferta.
 * - Solo usuarios registrados generan visitas.
 * - Se guarda un hash anónimo del userId (cumple Ley 19.628).
 * - Cada usuario solo puede sumar 1 visita por oferta.
 * - Los registros pueden eliminarse cuando la oferta deja de estar activa.
 */
@Entity('count_visits')
@Unique(['oferta', 'visitorHash']) // evita duplicados por usuario/oferta
export class CountVisit {
    @PrimaryGeneratedColumn()
    id: number;

    // 🔗 Relación con la oferta
    @ManyToOne(() => Oferta, (oferta) => oferta.countVisits, {
        onDelete: 'CASCADE', // si se elimina o cierra la oferta, se eliminan sus visitas
    })
    @JoinColumn({ name: 'oferta_id' })
    oferta: Oferta;

    // 🧱 Hash anónimo derivado del userId (ej: sha256("user:123"))
    @Column({ name: 'visitor_hash', type: 'char', length: 64 })
    visitorHash: string;

    // 🕒 Fecha en que se registró la visita
    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;
}
