import { Injectable } from '@nestjs/common';
import { Repository, DataSource } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { CountVisit } from '../../repository/count_visits/count-visits.entity';
import { Oferta } from '../../repository/job_offer/job-offer.entity';
import { createHash } from 'crypto';

@Injectable()
export class CountVisitService {
  constructor(
    @InjectRepository(CountVisit)
    private readonly visitRepo: Repository<CountVisit>,

    @InjectRepository(Oferta)
    private readonly ofertaRepo: Repository<Oferta>,

    private readonly ds: DataSource,
  ) { }

  /**
   * Registra una visita única por usuario o IP.
   * Si el usuario no está logueado, se usa el hash del IP para evitar duplicados.
   */
  async registerVisit(ofertaId: number, userId: number | null, ip?: string) {
    // Generar hash único del visitante
    const visitorHash = createHash('sha256')
      .update(userId ? `user:${userId}` : `ip:${ip ?? 'unknown'}`)
      .digest('hex');

    // Verificar si ya existe
    const existing = await this.visitRepo.findOne({
      where: { visitorHash, oferta: { id: ofertaId } },
      relations: ['oferta'],
    });

    if (existing) return { counted: false, reason: 'already_visited' };

    // Verificar oferta
    const oferta = await this.ofertaRepo.findOneBy({ id: ofertaId });
    if (!oferta) return { counted: false, reason: 'offer_not_found' };

    // Guardar registro de visita
    await this.visitRepo.save({ oferta, visitorHash });

    // Incrementar contador
    await this.ds.query(
      'UPDATE oferta SET visits_total = visits_total + 1 WHERE id = ?',
      [ofertaId],
    );

    // Consultar el valor actualizado
    const updated = await this.ofertaRepo.findOneBy({ id: ofertaId });

    return { counted: true, visitas: updated?.visitsTotal ?? 0 };
  }
}
