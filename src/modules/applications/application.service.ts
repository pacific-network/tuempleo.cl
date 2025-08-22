import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Postulacion } from '../../repository/applications/applications.entity';
import { CreatePostulacionDto } from './dto/create-postulacion.dto';
import { Postulante } from '../../repository/postulant/postulant.entity';
import { Oferta } from '../../repository/job_offer/job-offer.entity';

@Injectable()
export class PostulacionService {
  constructor(
    @InjectRepository(Postulacion)
    private readonly postulacionRepository: Repository<Postulacion>,

    @InjectRepository(Postulante)
    private readonly postulanteRepository: Repository<Postulante>,

    @InjectRepository(Oferta)
    private readonly ofertaRepository: Repository<Oferta>,
  ) {}

  async crearPostulacion(dto: CreatePostulacionDto): Promise<Postulacion> {
    const postulante = await this.postulanteRepository.findOne({ where: { id: dto.postulante_id } });
    if (!postulante) throw new NotFoundException(`Postulante con ID ${dto.postulante_id} no encontrado`);

    const oferta = await this.ofertaRepository.findOne({ where: { id: dto.oferta_id } });
    if (!oferta) throw new NotFoundException(`Oferta con ID ${dto.oferta_id} no encontrada`);

    const existe = await this.postulacionRepository.findOne({
      where: { postulante: { id: dto.postulante_id }, oferta: { id: dto.oferta_id } },
    });
    if (existe) throw new ConflictException('Ya estás inscrito en esta oferta');

    const postulacion = this.postulacionRepository.create({
      postulante,
      oferta,
      estado: 'enviada',
    });
    return this.postulacionRepository.save(postulacion);
  }

  async obtenerPostulacionesPorUsuario(usuarioId: number): Promise<Postulacion[]> {
    const postulante = await this.postulanteRepository.findOne({
      where: { usuario: { id: usuarioId } },
      relations: ['usuario'],
    });
    if (!postulante) {
      throw new NotFoundException(`Postulante con usuario ID ${usuarioId} no encontrado`);
    }

    return this.postulacionRepository.find({
      where: { postulante: { id: postulante.id } },
      relations: ['oferta'],
      order: { fechaPostulacion: 'DESC' },
    });
  }

  async obtenerPostulacionesPorOferta(ofertaId: number): Promise<Postulacion[]> {
    const oferta = await this.ofertaRepository.findOne({ where: { id: ofertaId } });
    if (!oferta) throw new NotFoundException(`Oferta con ID ${ofertaId} no encontrada`);

    return this.postulacionRepository.find({
      where: { oferta: { id: ofertaId } },
      relations: ['postulante', 'postulante.usuario'],
      order: { fechaPostulacion: 'DESC' },
    });
  }

  // ─────────────────────────────────────────────────────────
  //   NUEVO: conteo de postulantes ÚNICOS (COUNT DISTINCT)
  // ─────────────────────────────────────────────────────────
  async countUnicosPorOferta(ofertaId: number): Promise<number> {
    const row = await this.postulacionRepository
      .createQueryBuilder('p')
      .innerJoin('p.oferta', 'o')
      .innerJoin('p.postulante', 'post')
      .where('o.id = :ofertaId', { ofertaId })
      .select('COUNT(DISTINCT post.id)', 'count')
      .getRawOne<{ count: string }>();

    return Number(row?.count ?? 0);
  }

  // ─────────────────────────────────────────────────────────
  //   NUEVO: lista “única” (1 por postulante) para una oferta
  //   Implementación robusta: deduplicamos en memoria
  //   (si luego quieres hacerlo 100% en SQL, te armo el subquery).
  // ─────────────────────────────────────────────────────────
  async obtenerPostulacionesUnicasPorOferta(ofertaId: number): Promise<Postulacion[]> {
    const todas = await this.postulacionRepository.find({
      where: { oferta: { id: ofertaId } },
      relations: ['postulante', 'postulante.usuario'],
      order: { fechaPostulacion: 'DESC' }, // primero las más recientes
    });

    const vistos = new Set<number>();
    const unicas: Postulacion[] = [];
    for (const p of todas) {
      const pid = p.postulante?.id;
      if (pid && !vistos.has(pid)) {
        vistos.add(pid);
        unicas.push(p); // nos quedamos con la más reciente de ese postulante
      }
    }
    return unicas;
  }

  // ─────────────────────────────────────────────────────────
  //   NUEVO: batch counts para múltiples ofertas
  // ─────────────────────────────────────────────────────────
  async countDistinctByOfertaIds(ofertaIds: number[]): Promise<Record<number, number>> {
    if (!ofertaIds?.length) return {};

    const rows = await this.postulacionRepository
      .createQueryBuilder('p')
      .innerJoin('p.oferta', 'o')
      .innerJoin('p.postulante', 'post')
      .where('o.id IN (:...ids)', { ids: ofertaIds })
      .select('o.id', 'oferta_id')
      .addSelect('COUNT(DISTINCT post.id)', 'total')
      .groupBy('o.id')
      .getRawMany<{ oferta_id: number; total: string }>();

    const map: Record<number, number> = {};
    ofertaIds.forEach(id => (map[id] = 0));
    rows.forEach(r => (map[Number(r.oferta_id)] = Number(r.total) || 0));
    return map;
  }
}
