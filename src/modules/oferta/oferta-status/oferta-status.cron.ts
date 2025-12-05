// src/modules/oferta/oferta-status.cron.ts

import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { OfertaStatusService } from './oferta-status.service';

@Injectable()
export class OfertaStatusCron {
    constructor(private readonly ofertaStatusService: OfertaStatusService) { }

    @Cron('0 */30 * * * *') // cada 30 minutos
    async handleCron() {
        await this.ofertaStatusService.revisarOfertas();
    }
}
