import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Oferta } from '../../repository/job_offer/job-offer.entity';
import { Postulacion } from '../../repository/applications/applications.entity';
import { Postulante } from '../../repository/postulant/postulant.entity';
import {
  scoreOfertaPostulante,
  parseOfertaData,
  PESOS_MATCH,
  type DesgloseMatch,
  type ResultadoMatch,
} from './match.scoring';

// Re-export: antes estas definiciones vivían acá y hay código que las importa
// desde este archivo.
export { PESOS_MATCH, type DesgloseMatch, type ResultadoMatch };

@Injectable()
export class MatchService {
  constructor(
    @InjectRepository(Oferta)
    private readonly ofertaRepo: Repository<Oferta>,

    @InjectRepository(Postulacion)
    private readonly postulacionRepo: Repository<Postulacion>,

    @InjectRepository(Postulante)
    private readonly postulanteRepo: Repository<Postulante>,
  ) {}

  // El scoring vive en match.scoring.ts: es una función pura y también la usa
  // `applications` para persistir el score al crear la postulación.
  scoreOfertaPostulante(
    ofertaData: Record<string, any> | null | undefined,
    postulanteData: Record<string, any> | null | undefined,
  ): ResultadoMatch {
    return scoreOfertaPostulante(ofertaData, postulanteData);
  }

  private parseOfertaData(oferta: Oferta): Record<string, any> {
    return parseOfertaData(oferta);
  }

  // ======================================================
  // 👔 Empleador: candidatos de una oferta rankeados por match
  // ======================================================
  async candidatosDeOferta(ofertaId: number, userId: number, minScore = 0) {
    const oferta = await this.ofertaRepo.findOne({
      where: { id: ofertaId },
      relations: ['empleador', 'empleador.usuario'],
    });
    if (!oferta) throw new NotFoundException('La oferta no existe');
    if (oferta.empleador?.usuario?.id !== userId) {
      throw new BadRequestException('El empleador no es dueño de la oferta');
    }

    const ofertaData = this.parseOfertaData(oferta);

    const postulaciones = await this.postulacionRepo.find({
      where: { oferta: { id: ofertaId } },
      relations: ['postulante', 'postulante.usuario'],
      order: { fechaPostulacion: 'DESC' },
    });

    return postulaciones
      .map((post) => {
        const { score, desglose } = this.scoreOfertaPostulante(
          ofertaData,
          post.postulante?.data,
        );
        return {
          postulacion_id: post.id,
          estado: post.estado,
          fechaPostulacion: post.fechaPostulacion,
          score,
          desglose,
          postulante: {
            id: post.postulante?.id,
            nombres: post.postulante?.usuario?.nombres,
            apellidos: post.postulante?.usuario?.apellidos,
            email: post.postulante?.usuario?.email,
          },
        };
      })
      .filter((c) => c.score >= minScore)
      .sort((a, b) => b.score - a.score);
  }

  // ======================================================
  // 🙋 Candidato: match de su perfil contra una oferta
  // ======================================================
  async matchPostulanteOferta(ofertaId: number, userId: number): Promise<ResultadoMatch> {
    const oferta = await this.ofertaRepo.findOne({ where: { id: ofertaId } });
    if (!oferta) throw new NotFoundException('La oferta no existe');

    const postulante = await this.postulanteRepo.findOne({
      where: { usuario: { id: userId } },
    });
    if (!postulante) throw new NotFoundException('Postulante no encontrado');

    return this.scoreOfertaPostulante(this.parseOfertaData(oferta), postulante.data);
  }

  // ======================================================
  // 🙋 Candidato: ofertas a las que postuló, rankeadas por match
  // ======================================================
  async misOfertasConMatch(userId: number) {
    const postulante = await this.postulanteRepo.findOne({
      where: { usuario: { id: userId } },
    });
    if (!postulante) throw new NotFoundException('Postulante no encontrado');

    const postulaciones = await this.postulacionRepo.find({
      where: { postulante: { id: postulante.id } },
      relations: ['oferta'],
      order: { fechaPostulacion: 'DESC' },
    });

    return postulaciones
      .map((post) => {
        const { score, desglose } = this.scoreOfertaPostulante(
          this.parseOfertaData(post.oferta),
          postulante.data,
        );
        return {
          postulacion_id: post.id,
          estado: post.estado,
          oferta: { id: post.oferta?.id, titulo: post.oferta?.titulo },
          score,
          desglose,
        };
      })
      .sort((a, b) => b.score - a.score);
  }
}
