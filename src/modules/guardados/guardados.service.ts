import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TrabajoGuardado } from '../../repository/saved-job/saved-job.entity';
import { Oferta } from '../../repository/job_offer/job-offer.entity';
import { Postulante } from '../../repository/postulant/postulant.entity';

@Injectable()
export class GuardadosService {
  constructor(
    @InjectRepository(TrabajoGuardado) private readonly repo: Repository<TrabajoGuardado>,
    @InjectRepository(Oferta) private readonly ofertaRepo: Repository<Oferta>,
    @InjectRepository(Postulante) private readonly postulanteRepo: Repository<Postulante>,
  ) {}

  /** Resuelve el postulante del usuario autenticado (token.sub) */
  private async getPostulanteByUserSub(userSub: number) {
    const postulante = await this.postulanteRepo.findOne({
      where: { usuario: { id: userSub } },
      relations: ['usuario'],
    });
    if (!postulante) throw new NotFoundException('Postulante no encontrado para el usuario actual');
    return postulante;
  }

  async status(userSub: number, ofertaId: number) {
    const postulante = await this.getPostulanteByUserSub(userSub);
    const count = await this.repo.count({
      where: { postulante: { id: postulante.id }, oferta: { id: ofertaId } },
    });
    return { saved: count > 0 };
  }

  async save(userSub: number, ofertaId: number) {
    const postulante = await this.getPostulanteByUserSub(userSub);

    const oferta = await this.ofertaRepo.findOne({ where: { id: ofertaId } });
    if (!oferta) throw new NotFoundException('Oferta no encontrada');

    // idempotente
    const exists = await this.repo.count({
      where: { postulante: { id: postulante.id }, oferta: { id: oferta.id } },
    });
    if (exists) return { saved: true };

    try {
      const row = this.repo.create({ postulante, oferta });
      await this.repo.save(row);
      return { saved: true };
    } catch (e: any) {
      if (e.code === 'ER_NO_SUCH_TABLE') {
        throw new BadRequestException('Tabla "trabajos_guardados" no existe. Corre migraciones o habilita synchronize en dev.');
      }
      if (e.code === 'ER_NO_REFERENCED_ROW_2') {
        throw new BadRequestException('FK inválida: postulante u oferta no existen.');
      }
      if (e.code === 'ER_DUP_ENTRY') {
        return { saved: true };
      }
      throw e;
    }
  }

  async remove(userSub: number, ofertaId: number) {
    const postulante = await this.getPostulanteByUserSub(userSub);
    await this.repo.delete({ postulante: { id: postulante.id }, oferta: { id: ofertaId } });
    return { removed: true };
  }

  /** Paginado */
  async list(userSub: number, limit = 20, offset = 0) {
    const postulante = await this.getPostulanteByUserSub(userSub);
    const take = Math.min(limit ?? 20, 100);
    const skip = offset ?? 0;

    const [items, total] = await this.repo.findAndCount({
      where: { postulante: { id: postulante.id } },
      relations: ['oferta', 'oferta.empresa', 'oferta.empleador'],
      order: { createdAt: 'DESC' },
      take,
      skip,
    });

    return { total, items };
  }

  /** Todas las ofertas guardadas del candidato (sin paginar) */
  async listAllOffers(userSub: number) {
    const postulante = await this.getPostulanteByUserSub(userSub);

    const rows = await this.repo.find({
      where: { postulante: { id: postulante.id } },
      relations: ['oferta', 'oferta.empresa', 'oferta.empleador'],
      order: { createdAt: 'DESC' },
    });

    // Devuelve SOLO las ofertas
    return rows.map(r => r.oferta);
  }
}
