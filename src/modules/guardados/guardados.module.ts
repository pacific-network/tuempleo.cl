import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GuardadosController } from './guardados.controller';
import { GuardadosService } from './guardados.service';
import { TrabajoGuardado } from '../../repository/saved-job/saved-job.entity';
import { Oferta } from '../../repository/job_offer/job-offer.entity';
import { Postulante } from '../../repository/postulant/postulant.entity';

@Module({
  imports: [TypeOrmModule.forFeature([TrabajoGuardado, Oferta, Postulante])],
  controllers: [GuardadosController],
  providers: [GuardadosService],
})
export class GuardadosModule {}
