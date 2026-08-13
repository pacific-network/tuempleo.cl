// src/modules/cierre-postulaciones/cierre-postulaciones.module.ts

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';

import { Postulacion } from 'src/repository/applications/applications.entity';
import { Oferta } from 'src/repository/job_offer/job-offer.entity';

import { CierrePostulacionesService } from './cierre-postulaciones.service';
import { CierrePostulacionesCron } from './cierre-postulaciones.cron';
import { CierrePostulacionesController } from './cierre-postulaciones.controller';

import { MailerModule } from '../mailer/mailer.module';
import { SystemConfigModule } from '../system-config/system-config.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Postulacion, Oferta]),
    ScheduleModule.forRoot(),
    MailerModule,
    SystemConfigModule,
  ],
  providers: [CierrePostulacionesService, CierrePostulacionesCron],
  controllers: [CierrePostulacionesController],
  // OfertaModule lo usa para cerrar las postulaciones en el mismo instante en
  // que una oferta pasa a expirada/completada.
  exports: [CierrePostulacionesService],
})
export class CierrePostulacionesModule {}
