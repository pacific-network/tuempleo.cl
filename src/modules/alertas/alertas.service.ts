import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual } from 'typeorm';
import { AlertaEmpleo } from 'src/repository/alerta-empleo/alerta-empleo.entity';
import { Postulante } from 'src/repository/postulant/postulant.entity';
import { Oferta } from 'src/repository/job_offer/job-offer.entity';
import { MailerService } from '../mailer/mailer.service';
import { CreateAlertaDto } from './dto/create-alerta.dto';

@Injectable()
export class AlertasService {
  constructor(
    @InjectRepository(AlertaEmpleo)
    private readonly alertaRepo: Repository<AlertaEmpleo>,
    @InjectRepository(Postulante)
    private readonly postulanteRepo: Repository<Postulante>,
    @InjectRepository(Oferta)
    private readonly ofertaRepo: Repository<Oferta>,
    private readonly mailerService: MailerService,
  ) {}

  private async getPostulante(userSub: number): Promise<Postulante> {
    const postulante = await this.postulanteRepo.findOne({
      where: { usuario: { id: userSub } },
      relations: ['usuario'],
    });
    if (!postulante) throw new NotFoundException('Perfil de postulante no encontrado');
    return postulante;
  }

  async create(userSub: number, dto: CreateAlertaDto): Promise<AlertaEmpleo> {
    if (!dto.keywords && !dto.categoria && !dto.modalidad && !dto.region) {
      throw new BadRequestException('Debes indicar al menos un criterio de búsqueda');
    }

    const postulante = await this.getPostulante(userSub);

    const alerta = this.alertaRepo.create({
      postulante,
      keywords: dto.keywords ?? null,
      categoria: dto.categoria ?? null,
      modalidad: dto.modalidad ?? null,
      region: dto.region ?? null,
      frecuencia: dto.frecuencia ?? 'diaria',
      activa: true,
      ultima_ejecucion: null,
    });

    return this.alertaRepo.save(alerta);
  }

  async findAll(userSub: number): Promise<AlertaEmpleo[]> {
    const postulante = await this.getPostulante(userSub);
    return this.alertaRepo.find({
      where: { postulante: { id: postulante.id } },
      order: { created_at: 'DESC' },
    });
  }

  async remove(userSub: number, alertaId: number): Promise<{ removed: boolean }> {
    const postulante = await this.getPostulante(userSub);
    const alerta = await this.alertaRepo.findOne({
      where: { id: alertaId },
      relations: ['postulante'],
    });
    if (!alerta) throw new NotFoundException('Alerta no encontrada');
    if (alerta.postulante.id !== postulante.id) throw new ForbiddenException();
    await this.alertaRepo.remove(alerta);
    return { removed: true };
  }

  async toggle(userSub: number, alertaId: number): Promise<AlertaEmpleo> {
    const postulante = await this.getPostulante(userSub);
    const alerta = await this.alertaRepo.findOne({
      where: { id: alertaId },
      relations: ['postulante'],
    });
    if (!alerta) throw new NotFoundException('Alerta no encontrada');
    if (alerta.postulante.id !== postulante.id) throw new ForbiddenException();
    alerta.activa = !alerta.activa;
    return this.alertaRepo.save(alerta);
  }

  // ─────────────────────────────────────────────────
  // CRON: procesa todas las alertas activas
  // ─────────────────────────────────────────────────
  async procesarAlertas(): Promise<void> {
    const alertas = await this.alertaRepo.find({
      where: { activa: true },
      relations: ['postulante', 'postulante.usuario'],
    });

    for (const alerta of alertas) {
      await this.procesarAlerta(alerta);
    }
  }

  private async procesarAlerta(alerta: AlertaEmpleo): Promise<void> {
    const ahora = new Date();
    const diasAtras = alerta.frecuencia === 'semanal' ? 7 : 1;

    // Solo ejecutar si corresponde según frecuencia y última ejecución
    if (alerta.ultima_ejecucion) {
      const diffMs = ahora.getTime() - alerta.ultima_ejecucion.getTime();
      const diffDias = diffMs / (1000 * 60 * 60 * 24);
      if (diffDias < diasAtras) return;
    }

    const desde = new Date();
    desde.setDate(desde.getDate() - diasAtras);

    const qb = this.ofertaRepo
      .createQueryBuilder('oferta')
      .where('oferta.es_activa = :activa', { activa: true })
      .andWhere('oferta.fecha_publicacion >= :desde', { desde });

    if (alerta.keywords) {
      const terms = alerta.keywords
        .split(',')
        .map((k) => k.trim().toLowerCase())
        .filter(Boolean);

      if (terms.length > 0) {
        const conditions = terms
          .map((_, i) => `LOWER(oferta.titulo) LIKE :kw${i}`)
          .join(' OR ');
        const params: Record<string, string> = {};
        terms.forEach((t, i) => (params[`kw${i}`] = `%${t}%`));
        qb.andWhere(`(${conditions})`, params);
      }
    }

    if (alerta.modalidad) {
      qb.andWhere(
        "LOWER(JSON_UNQUOTE(JSON_EXTRACT(oferta.data,'$.modalidad'))) LIKE :modalidad",
        { modalidad: `%${alerta.modalidad.toLowerCase()}%` },
      );
    }

    if (alerta.region) {
      qb.andWhere(
        "LOWER(JSON_UNQUOTE(JSON_EXTRACT(oferta.data,'$.region'))) LIKE :region",
        { region: `%${alerta.region.toLowerCase()}%` },
      );
    }

    if (alerta.categoria) {
      qb.andWhere(
        "LOWER(JSON_UNQUOTE(JSON_EXTRACT(oferta.data,'$.categoria'))) LIKE :categoria",
        { categoria: `%${alerta.categoria.toLowerCase()}%` },
      );
    }

    const ofertas = await qb.limit(10).getMany();

    if (ofertas.length > 0) {
      await this.enviarEmailAlerta(alerta, ofertas).catch(() => {
        // no bloquear el loop si el mail falla
      });
    }

    alerta.ultima_ejecucion = ahora;
    await this.alertaRepo.save(alerta);
  }

  private async enviarEmailAlerta(
    alerta: AlertaEmpleo,
    ofertas: Oferta[],
  ): Promise<void> {
    const usuario = alerta.postulante.usuario;

    await this.mailerService.sendTemplateMail({
      to: usuario.email,
      nombre: `${usuario.nombres} ${usuario.apellidos}`,
      subject: `Nuevas ofertas que coinciden con tu alerta`,
      template: 'alerta_empleo',
      data: {
        nombre: usuario.nombres,
        criterios: {
          keywords: alerta.keywords,
          categoria: alerta.categoria,
          modalidad: alerta.modalidad,
          region: alerta.region,
        },
        ofertas: ofertas.map((o) => ({
          id: o.id,
          titulo: o.titulo,
          fecha_publicacion: o.fecha_publicacion,
        })),
      },
    });
  }
}
