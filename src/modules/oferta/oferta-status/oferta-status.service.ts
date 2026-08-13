// src/modules/oferta/oferta-status/oferta-status.service.ts

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Oferta } from 'src/repository/job_offer/job-offer.entity';
import { ProcesoSeleccion } from 'src/repository/hiring_process/hiring_process.entity';
import { CierrePostulacionesService } from 'src/modules/cierre-postulaciones/cierre-postulaciones.service';

@Injectable()
export class OfertaStatusService {
  constructor(
    @InjectRepository(Oferta)
    private readonly ofertaRepository: Repository<Oferta>,

    @InjectRepository(ProcesoSeleccion)
    private readonly procesoSeleccionRepository: Repository<ProcesoSeleccion>,

    private readonly cierrePostulacionesService: CierrePostulacionesService,
  ) { }

  /**
   * 🔍 Actualiza el estado de UNA oferta
   */
  async actualizarEstadoOferta(ofertaId: number): Promise<void> {
    const oferta = await this.ofertaRepository.findOne({ where: { id: ofertaId } });

    if (!oferta) return;

    if (!oferta.es_activa) return; // ya cerrada o expirada

    /** -----------------------------------
     * 1️⃣ CONTAR CONTRATADOS DE LA OFERTA
     * ----------------------------------- */
    const cantidadContratados = await this.procesoSeleccionRepository.count({
      where: {
        estado: 'contratado',
        postulacion: { oferta: { id: ofertaId } },
      },
      relations: {
        postulacion: { oferta: true },
      },
    });

    if (cantidadContratados >= oferta.numero_vacantes) {
      oferta.estado = 'completada';
      oferta.es_activa = false;
      oferta.fecha_cierre = new Date();
      await this.ofertaRepository.save(oferta);
      await this.cerrarPostulacionesPendientes(oferta.id);
      return;
    }

    /** -----------------------------------
     * 2️⃣ VERIFICAR EXPIRACIÓN POR FECHA
     * ----------------------------------- */
    const fechaExpiracion = new Date(oferta.fecha_publicacion);
    fechaExpiracion.setDate(
      fechaExpiracion.getDate() + oferta.duracion_publicacion,
    );

    if (new Date() > fechaExpiracion) {
      oferta.estado = 'expirada';
      oferta.es_activa = false;
      oferta.fecha_cierre = new Date();
      await this.ofertaRepository.save(oferta);
      await this.cerrarPostulacionesPendientes(oferta.id);
      return;
    }
  }

  /**
   * 📪 Cierra las postulaciones que quedaron colgadas al terminar la oferta.
   * Nunca debe voltear el cierre de la oferta: si el cierre de postulaciones
   * falla, la oferta ya quedó bien guardada y el barrido diario reintenta.
   */
  private async cerrarPostulacionesPendientes(ofertaId: number): Promise<void> {
    try {
      await this.cierrePostulacionesService.cerrarPorOferta(ofertaId);
    } catch (error) {
      console.error(
        `No se pudieron cerrar las postulaciones de la oferta ${ofertaId}:`,
        error,
      );
    }
  }

  /**
   * 🔁 Revisa TODAS las ofertas activas
   */
  async revisarOfertas(): Promise<void> {
    const ofertas = await this.ofertaRepository.find({
      where: { es_activa: true },
    });

    for (const oferta of ofertas) {
      await this.actualizarEstadoOferta(oferta.id);
    }
  }
}
