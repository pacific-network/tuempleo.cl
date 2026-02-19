import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { AlertasService } from './alertas.service';

@Injectable()
export class AlertasCron {
  constructor(private readonly alertasService: AlertasService) {}

  // Todos los días a las 8:00 AM
  @Cron('0 8 * * *')
  async handleCron() {
    await this.alertasService.procesarAlertas();
  }
}
