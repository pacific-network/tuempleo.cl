import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { AlertaEmpleo } from 'src/repository/alerta-empleo/alerta-empleo.entity';
import { Postulante } from 'src/repository/postulant/postulant.entity';
import { Oferta } from 'src/repository/job_offer/job-offer.entity';
import { AlertasService } from './alertas.service';
import { AlertasController } from './alertas.controller';
import { AlertasCron } from './alertas.cron';
import { MailerModule } from '../mailer/mailer.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([AlertaEmpleo, Postulante, Oferta]),
    ScheduleModule.forRoot(),
    MailerModule,
  ],
  providers: [AlertasService, AlertasCron],
  controllers: [AlertasController],
})
export class AlertasModule {}
