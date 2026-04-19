import { Injectable } from '@nestjs/common';
import { Repository, DataSource } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Oferta } from '../../repository/job_offer/job-offer.entity';
import { createHash } from 'crypto';

@Injectable()
export class CountVisitService {
  constructor(
    @InjectRepository(Oferta)
    private readonly ofertaRepo: Repository<Oferta>,

    private readonly ds: DataSource,
  ) { }

  /**
   * Registra una visita única por usuario o IP.
   * Si el usuario no está logueado, se usa el hash del IP para evitar duplicados.
   */
  async registerVisit(ofertaId: number, userId: number | null, ip?: string) {
    const visitorHash = createHash('sha256')
      .update(userId ? `user:${userId}` : `ip:${ip ?? 'unknown'}`)
      .digest('hex');

    const oferta = await this.ofertaRepo.findOneBy({ id: ofertaId });
    if (!oferta) return { counted: false, reason: 'offer_not_found' };

    const result = await this.ds.query(
      'INSERT IGNORE INTO count_visits (visitor_hash, oferta_id) VALUES (?, ?)',
      [visitorHash, ofertaId],
    );

    const inserted = (result?.affectedRows ?? 0) === 1;
    if (!inserted) return { counted: false, reason: 'already_visited' };

    await this.ds.query(
      'UPDATE oferta SET visits_total = visits_total + 1 WHERE id = ?',
      [ofertaId],
    );

    const updated = await this.ofertaRepo.findOneBy({ id: ofertaId });
    return { counted: true, visitas: updated?.visitsTotal ?? 0 };
  }
}
