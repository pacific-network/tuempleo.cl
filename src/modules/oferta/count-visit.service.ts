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
  ) {}

  async registerVisit(ofertaId: number, userId: number) {
    if (!userId) return { counted: false }; // solo usuarios logueados

    const visitorHash = createHash('sha256')
      .update(`user:${userId}`)
      .digest('hex');

    // Verificar si el usuario ya vio esta oferta
    const existing = await this.visitRepo.findOne({
      where: { visitorHash, oferta: { id: ofertaId } },
      relations: ['oferta'],
    });

    if (!existing) {
      const oferta = await this.ofertaRepo.findOneBy({ id: ofertaId });
      if (!oferta) return { counted: false };

      await this.visitRepo.save({ oferta, visitorHash });
      await this.ds.query(
        'UPDATE oferta SET visits_total = visits_total + 1 WHERE id = ?',
        [ofertaId],
      );

      return { counted: true };
    }

    return { counted: false };
  }
}
