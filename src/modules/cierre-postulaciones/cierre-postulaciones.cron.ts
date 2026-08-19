// src/modules/cierre-postulaciones/cierre-postulaciones.cron.ts

import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { CierrePostulacionesService } from './cierre-postulaciones.service';

@Injectable()
export class CierrePostulacionesCron {
  constructor(
    private readonly cierrePostulacionesService: CierrePostulacionesService,
  ) {}

  // 09:00 todos los días, después del cron de alertas (08:00) para no
  // superponer envíos de correo.
  @Cron('0 9 * * *')
  async handleCron() {
    await this.cierrePostulacionesService.ejecutarBarrido();
  }
}
