import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Oferta } from '../../repository/job_offer/job-offer.entity';
import { Postulacion } from '../../repository/applications/applications.entity';
import { Postulante } from '../../repository/postulant/postulant.entity';

// ======================================================
// ⚖️ Pesos del match (suman 100). Exportados para tuning.
// ======================================================
export const PESOS_MATCH = {
  area: 30,
  experiencia: 25,
  modalidad: 15,
  ubicacion: 15,
  educacion: 10,
  herramientas: 5,
} as const;

export type DesgloseMatch = Record<keyof typeof PESOS_MATCH, number>;

export interface ResultadoMatch {
  score: number;
  desglose: DesgloseMatch;
}

// Orden ascendente de seniority para comparar nivel de experiencia.
const NIVELES_EXPERIENCIA = [
  'sin_experiencia',
  'con_experiencia',
  'junior',
  'semi_senior',
  'senior',
  'experto',
];

// ======================================================
// 🔤 Normalización: minúsculas y sin tildes
// ======================================================
function norm(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function incluyeAlguno(haystack: string, agujas: string[]): boolean {
  const h = norm(haystack);
  return agujas.some((a) => {
    const n = norm(a);
    return n.length > 0 && (h.includes(n) || n.includes(h));
  });
}

function asArray(value: unknown): any[] {
  return Array.isArray(value) ? value : [];
}

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

  // ======================================================
  // 🧮 Función pura de scoring (oferta vs perfil del postulante)
  // ======================================================
  scoreOfertaPostulante(
    ofertaData: Record<string, any> | null | undefined,
    postulanteData: Record<string, any> | null | undefined,
  ): ResultadoMatch {
    const o = ofertaData ?? {};
    const p = postulanteData ?? {};

    const experiencias = asArray(p.experiencias);
    const cargos = experiencias.map((e) => e?.cargo).filter(Boolean);
    const educacion = asArray(p.datos_personales?.educacion ?? p.educacion);
    const titulos = educacion.map((e) => e?.titulo).filter(Boolean);
    const preferencias = p.preferencias ?? {};
    const habilidades = [
      ...asArray(p.habilidades),
      ...asArray(p.herramientas),
      ...asArray(preferencias.herramientas),
    ]
      .map((h) => (typeof h === 'string' ? h : h?.nombre))
      .filter(Boolean);

    const desglose: DesgloseMatch = {
      area: 0,
      experiencia: 0,
      modalidad: 0,
      ubicacion: 0,
      educacion: 0,
      herramientas: 0,
    };

    // 1️⃣ Área / categoría de empleo
    const area = o.area_trabajo;
    if (area) {
      const matchCategoria = incluyeAlguno(preferencias.categoria_empleo ?? '', [area]);
      const matchCargo = cargos.some((c) => incluyeAlguno(c, [area]));
      if (matchCategoria && matchCargo) desglose.area = PESOS_MATCH.area;
      else if (matchCategoria || matchCargo) desglose.area = Math.round(PESOS_MATCH.area * 0.7);
    } else {
      // Sin requisito de área → no penalizar.
      desglose.area = PESOS_MATCH.area;
    }

    // 2️⃣ Experiencia / nivel
    const nivelOferta = norm(o.nivel_experiencia);
    if (!nivelOferta || nivelOferta === 'sin_experiencia') {
      desglose.experiencia = PESOS_MATCH.experiencia;
    } else {
      const idxOferta = NIVELES_EXPERIENCIA.indexOf(nivelOferta);
      // Años acumulados declarados por el candidato (si existen).
      const aniosCandidato = experiencias.reduce((acc, e) => acc + (Number(e?.anios) || 0), 0);
      const nivelCandidato = this.inferirNivel(aniosCandidato, experiencias.length);
      const idxCandidato = NIVELES_EXPERIENCIA.indexOf(nivelCandidato);

      if (idxCandidato >= idxOferta && idxOferta >= 0) {
        desglose.experiencia = PESOS_MATCH.experiencia;
      } else if (idxOferta >= 0) {
        // Cuanto más cerca del nivel requerido, mayor puntaje parcial.
        const distancia = Math.max(0, idxOferta - idxCandidato);
        const factor = Math.max(0, 1 - distancia * 0.34);
        desglose.experiencia = Math.round(PESOS_MATCH.experiencia * factor);
      }
    }

    // 3️⃣ Modalidad
    const modalidadOferta = norm(o.modalidad);
    const modalidadCandidato = norm(preferencias.modalidad);
    if (!modalidadOferta || !modalidadCandidato || modalidadOferta === 'hibrido') {
      desglose.modalidad = PESOS_MATCH.modalidad;
    } else if (modalidadOferta === modalidadCandidato || modalidadCandidato === 'hibrido') {
      desglose.modalidad = PESOS_MATCH.modalidad;
    }

    // 4️⃣ Ubicación (irrelevante si la oferta es remota)
    if (modalidadOferta === 'remoto' || !o.region) {
      desglose.ubicacion = PESOS_MATCH.ubicacion;
    } else {
      const regionCand = preferencias.region ?? p.datos_personales?.region ?? p.region;
      const comunaCand = preferencias.comuna ?? p.datos_personales?.comuna ?? p.comuna;
      const matchRegion = incluyeAlguno(o.region, [regionCand]);
      const matchComuna = o.comuna ? incluyeAlguno(o.comuna, [comunaCand]) : false;
      if (matchComuna) desglose.ubicacion = PESOS_MATCH.ubicacion;
      else if (matchRegion) desglose.ubicacion = Math.round(PESOS_MATCH.ubicacion * 0.7);
    }

    // 5️⃣ Educación
    if (!o.educacion_requerida) {
      desglose.educacion = PESOS_MATCH.educacion;
    } else if (titulos.some((t) => incluyeAlguno(t, [o.educacion_requerida]))) {
      desglose.educacion = PESOS_MATCH.educacion;
    }

    // 6️⃣ Herramientas / requisitos
    const requeridas = [
      ...asArray(o.herramientas_basicas),
      ...asArray(o.otras_herramientas),
      ...asArray(o.requisitos_minimos),
    ].filter(Boolean);
    if (requeridas.length === 0) {
      desglose.herramientas = PESOS_MATCH.herramientas;
    } else {
      const cubiertas = requeridas.filter((r) => incluyeAlguno(r, habilidades)).length;
      desglose.herramientas = Math.round((cubiertas / requeridas.length) * PESOS_MATCH.herramientas);
    }

    const score = Object.values(desglose).reduce((a, b) => a + b, 0);
    return { score: Math.min(100, Math.max(0, score)), desglose };
  }

  private inferirNivel(anios: number, cantidadExperiencias: number): string {
    if (anios <= 0 && cantidadExperiencias === 0) return 'sin_experiencia';
    if (anios < 1) return 'con_experiencia';
    if (anios < 3) return 'junior';
    if (anios < 5) return 'semi_senior';
    if (anios < 8) return 'senior';
    return 'experto';
  }

  // Parseo defensivo del campo Oferta.data (columna text con JSON).
  private parseOfertaData(oferta: Oferta): Record<string, any> {
    if (!oferta?.data) return {};
    if (typeof oferta.data === 'object') return oferta.data as Record<string, any>;
    try {
      return JSON.parse(oferta.data);
    } catch {
      return {};
    }
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
