// src/modules/cierre-postulaciones/cierre-postulaciones.controller.ts

import { Controller, Post, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../auth/guards/admin.guard';
import { CierrePostulacionesService } from './cierre-postulaciones.service';

@Controller()
export class CierrePostulacionesController {
  constructor(private readonly service: CierrePostulacionesService) {}

  /**
   * Dispara el barrido a mano y devuelve el resumen. Sirve para verificar el
   * volumen real de cierres antes de prender el envío de correos, sin esperar
   * al cron de las 09:00.
   */
  @UseGuards(AdminGuard)
  @Post('v1/admin/cierre-automatico/ejecutar')
  ejecutar() {
    return this.service.ejecutarBarrido();
  }
}
