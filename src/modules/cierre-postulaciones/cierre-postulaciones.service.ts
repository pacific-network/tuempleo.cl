// src/modules/cierre-postulaciones/cierre-postulaciones.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, UpdateQueryBuilder } from 'typeorm';

import { CierreMotivo, Postulacion } from 'src/repository/applications/applications.entity';
import { Oferta } from 'src/repository/job_offer/job-offer.entity';
import { MailerService } from '../mailer/mailer.service';
import {
  CierreAutomaticoConfig,
  SystemConfigService,
} from '../system-config/system-config.service';

/**
 * Estados en los que el candidato todavía no tuvo interacción real con la
 * empresa. Se cierran sin pedirle nada al empleador.
 */
export const ESTADOS_TEMPRANOS = [
  'enviada',
  'vista',
  'en_revision',
  'cualificado',
] as const;

/**
 * Estados con proceso real en curso. Nunca se cierran de inmediato: primero
 * se avisa al empleador y se le da un periodo de gracia para resolver.
 */
export const ESTADOS_AVANZADOS = ['preseleccionado', 'seleccionado'] as const;

/**
 * Solo se notifican cierres recientes. Sin esta ventana, prender el flag de
 * correo dispararía un envío masivo sobre todo el histórico acumulado.
 */
export const VENTANA_NOTIFICACION_DIAS = 7;

export interface ResumenBarrido {
  cerradasPorOferta: number;
  cerradasPorInactividad: number;
  cerradasTrasGracia: number;
  empleadoresAvisados: number;
  correosEnviados: number;
  correosFallidos: number;
}

const RESUMEN_VACIO: ResumenBarrido = {
  cerradasPorOferta: 0,
  cerradasPorInactividad: 0,
  cerradasTrasGracia: 0,
  empleadoresAvisados: 0,
  correosEnviados: 0,
  correosFallidos: 0,
};

/** Texto honesto para el candidato según por qué terminó su postulación. */
export const TEXTO_MOTIVO: Record<CierreMotivo, string> = {
  oferta_expirada:
    'La oferta dejó de estar publicada y el proceso se cerró sin selección.',
  vacante_completada:
    'La empresa completó las vacantes con otros candidatos.',
  oferta_eliminada: 'La empresa retiró esta oferta.',
  inactividad:
    'El proceso no tuvo avances en el plazo esperado y se cerró automáticamente.',
};

@Injectable()
export class CierrePostulacionesService {
  private readonly logger = new Logger(CierrePostulacionesService.name);

  constructor(
    @InjectRepository(Postulacion)
    private readonly postulacionRepo: Repository<Postulacion>,

    @InjectRepository(Oferta)
    private readonly ofertaRepo: Repository<Oferta>,

    private readonly systemConfig: SystemConfigService,
    private readonly mailerService: MailerService,
  ) {}

  /** Motivo de cierre que corresponde al estado terminal de una oferta. */
  private motivoPorOferta(oferta: Oferta): CierreMotivo | null {
    switch (oferta.estado) {
      case 'expirada':
        return 'oferta_expirada';
      case 'completada':
        return 'vacante_completada';
      case 'eliminada':
        return 'oferta_eliminada';
      default:
        return null;
    }
  }

  /**
   * Cierra las postulaciones tempranas de una oferta que acaba de terminar y,
   * si quedaron candidatos avanzados sin resolver, abre el periodo de gracia
   * avisando al empleador.
   *
   * Se llama desde OfertaStatusService en el mismo momento en que la oferta
   * pasa a expirada/completada, para que el cierre sea inmediato y no espere
   * al barrido diario.
   */
  async cerrarPorOferta(ofertaId: number): Promise<ResumenBarrido> {
    const config = await this.systemConfig.getCierreAutomatico();
    if (!config.enabled) return { ...RESUMEN_VACIO };

    // withDeleted: una oferta retirada por el empleador queda soft-deleted, y
    // es justo el caso donde más urge cerrarle el proceso al candidato.
    const oferta = await this.ofertaRepo.findOne({
      where: { id: ofertaId },
      withDeleted: true,
    });
    if (!oferta) return { ...RESUMEN_VACIO };

    const motivo = this.motivoPorOferta(oferta);
    if (!motivo) return { ...RESUMEN_VACIO };

    const cerradas = await this.cerrarLote(
      motivo,
      (qb) =>
        qb
          .andWhere('oferta_id = :ofertaId', { ofertaId })
          .andWhere('estado IN (:...estados)', { estados: [...ESTADOS_TEMPRANOS] }),
    );

    // Los avanzados no se tocan todavía: el empleador tiene su plazo.
    const avanzados = await this.postulacionRepo
      .createQueryBuilder('p')
      .where('p.oferta_id = :ofertaId', { ofertaId })
      .andWhere('p.estado IN (:...estados)', { estados: [...ESTADOS_AVANZADOS] })
      .getCount();

    let empleadoresAvisados = 0;
    if (avanzados > 0 && !oferta.aviso_cierre_pendientes_at) {
      oferta.aviso_cierre_pendientes_at = new Date();
      await this.ofertaRepo.save(oferta);
      empleadoresAvisados = await this.avisarEmpleadorPendientes(
        oferta,
        avanzados,
        config,
      );
    }

    return { ...RESUMEN_VACIO, cerradasPorOferta: cerradas, empleadoresAvisados };
  }

  /**
   * Cierra postulaciones tempranas que llevan demasiado tiempo sin movimiento
   * aunque su oferta siga publicada. Es el caso más común de silencio: el
   * aviso sigue arriba y nadie revisó nunca al candidato.
   */
  async barrerInactividad(config: CierreAutomaticoConfig): Promise<number> {
    const limite = new Date();
    limite.setDate(limite.getDate() - config.diasInactividad);

    return this.cerrarLote('inactividad', (qb) =>
      qb
        .andWhere('estado IN (:...estados)', { estados: [...ESTADOS_TEMPRANOS] })
        .andWhere(
          'COALESCE(fecha_actualizacion, fecha_postulacion) < :limite',
          { limite },
        )
        // Solo ofertas vivas: las cerradas ya las resolvió cerrarPorOferta.
        .andWhere('oferta_id IN (SELECT id FROM oferta WHERE es_activa = 1)'),
    );
  }

  /**
   * Cierra los candidatos avanzados de ofertas ya terminadas cuyo periodo de
   * gracia venció sin que el empleador los resolviera.
   */
  async barrerGraciaAvanzados(config: CierreAutomaticoConfig): Promise<number> {
    const limite = new Date();
    limite.setDate(limite.getDate() - config.diasGraciaAvanzados);

    const ofertas = await this.ofertaRepo
      .createQueryBuilder('o')
      .withDeleted()
      .where('o.es_activa = 0')
      .andWhere('o.aviso_cierre_pendientes_at IS NOT NULL')
      .andWhere('o.aviso_cierre_pendientes_at < :limite', { limite })
      .getMany();

    let total = 0;
    for (const oferta of ofertas) {
      const motivo = this.motivoPorOferta(oferta);
      if (!motivo) continue;

      total += await this.cerrarLote(motivo, (qb) =>
        qb
          .andWhere('oferta_id = :ofertaId', { ofertaId: oferta.id })
          .andWhere('estado IN (:...estados)', { estados: [...ESTADOS_AVANZADOS] }),
      );
    }
    return total;
  }

  /**
   * Barrido completo. Lo dispara el cron diario y también puede invocarse a
   * mano desde el panel admin.
   */
  async ejecutarBarrido(): Promise<ResumenBarrido> {
    const config = await this.systemConfig.getCierreAutomatico();
    if (!config.enabled) {
      this.logger.log('Cierre automático desactivado; no se hace nada.');
      return { ...RESUMEN_VACIO };
    }

    const cerradasPorInactividad = await this.barrerInactividad(config);
    const cerradasTrasGracia = await this.barrerGraciaAvanzados(config);
    const envio = await this.notificarCierresPendientes(config);

    const resumen: ResumenBarrido = {
      ...RESUMEN_VACIO,
      cerradasPorInactividad,
      cerradasTrasGracia,
      ...envio,
    };

    this.logger.log(`Barrido de cierre automático: ${JSON.stringify(resumen)}`);
    return resumen;
  }

  /**
   * Notifica los cierres recientes que aún no se avisaron. El envío está
   * gobernado por su propio interruptor: se puede cerrar sin notificar
   * mientras se mide el volumen real.
   */
  async notificarCierresPendientes(
    config: CierreAutomaticoConfig,
  ): Promise<Pick<ResumenBarrido, 'correosEnviados' | 'correosFallidos'>> {
    if (!config.notificarEmail || !config.messageIdCandidato) {
      return { correosEnviados: 0, correosFallidos: 0 };
    }

    const desde = new Date();
    desde.setDate(desde.getDate() - VENTANA_NOTIFICACION_DIAS);

    const pendientes = await this.postulacionRepo
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.postulante', 'postulante')
      .leftJoinAndSelect('postulante.usuario', 'usuario')
      .leftJoinAndSelect('p.oferta', 'oferta')
      .leftJoinAndSelect('oferta.empresa', 'empresa')
      .where('p.cierre_automatico = 1')
      .andWhere('p.cierre_notificado_at IS NULL')
      .andWhere('p.fecha_cierre IS NOT NULL')
      .andWhere('p.fecha_cierre >= :desde', { desde })
      .orderBy('p.fecha_cierre', 'ASC')
      .take(config.maxCorreosPorEjecucion)
      .getMany();

    let correosEnviados = 0;
    let correosFallidos = 0;

    for (const postulacion of pendientes) {
      const email = postulacion.postulante?.usuario?.email;
      if (!email || !postulacion.cierreMotivo) {
        // Sin destinatario no hay nada que reintentar: se sella y sigue.
        await this.marcarNotificada(postulacion.id);
        continue;
      }

      try {
        await this.mailerService.sendTemplateMail({
          dest_email: email,
          message_id: config.messageIdCandidato,
          // Los nombres coinciden con los @Placeholder@ de
          // templates/postulacion-cerrada.html
          Nombre: postulacion.postulante?.usuario?.nombres ?? '',
          TituloOferta: postulacion.oferta?.titulo ?? 'la oferta',
          NombreEmpresa: postulacion.oferta?.empresa?.nombre_fantasia ?? '',
          Motivo: TEXTO_MOTIVO[postulacion.cierreMotivo],
        });
        await this.marcarNotificada(postulacion.id);
        correosEnviados++;
      } catch (error) {
        // No se sella: el próximo barrido lo reintenta.
        correosFallidos++;
        this.logger.warn(
          `Falló el aviso de cierre de la postulación ${postulacion.id}: ${error}`,
        );
      }
    }

    return { correosEnviados, correosFallidos };
  }

  /** Avisa al empleador que le quedaron candidatos avanzados sin resolver. */
  private async avisarEmpleadorPendientes(
    oferta: Oferta,
    pendientes: number,
    config: CierreAutomaticoConfig,
  ): Promise<number> {
    if (!config.notificarEmail || !config.messageIdEmpleador) return 0;

    const completa = await this.ofertaRepo.findOne({
      where: { id: oferta.id },
      relations: ['empleador', 'empleador.usuario'],
      withDeleted: true,
    });
    const email = completa?.empleador?.usuario?.email;
    if (!email) return 0;

    try {
      await this.mailerService.sendTemplateMail({
        dest_email: email,
        message_id: config.messageIdEmpleador,
        // Placeholders de templates/candidatos-sin-resolver.html
        Nombre: completa?.empleador?.usuario?.nombres ?? '',
        TituloOferta: oferta.titulo,
        Pendientes: String(pendientes),
        DiasPlazo: String(config.diasGraciaAvanzados),
      });
      return 1;
    } catch (error) {
      this.logger.warn(
        `Falló el aviso de pendientes al empleador de la oferta ${oferta.id}: ${error}`,
      );
      return 0;
    }
  }

  /**
   * Aplica el cierre en un UPDATE masivo. Los cierres son de a miles en el
   * primer barrido, así que no se instancian entidades una por una.
   */
  private async cerrarLote(
    motivo: CierreMotivo,
    filtro: (qb: UpdateQueryBuilder<Postulacion>) => unknown,
  ): Promise<number> {
    const qb = this.postulacionRepo
      .createQueryBuilder()
      .update(Postulacion)
      .set({
        estado: 'no_seleccionado',
        cierreMotivo: motivo,
        cierreAutomatico: true,
        fechaCierre: () => 'NOW()',
      })
      .where('1 = 1');

    filtro(qb);

    const { affected } = await qb.execute();
    return affected ?? 0;
  }

  private async marcarNotificada(postulacionId: number): Promise<void> {
    await this.postulacionRepo
      .createQueryBuilder()
      .update(Postulacion)
      .set({ cierreNotificadoAt: () => 'NOW()' })
      .where('id = :postulacionId', { postulacionId })
      .execute();
  }
}
