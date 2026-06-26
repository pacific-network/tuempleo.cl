import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MatchController } from './match.controller';
import { MatchService } from './match.service';
import { Oferta } from '../../repository/job_offer/job-offer.entity';
import { Postulacion } from '../../repository/applications/applications.entity';
import { Postulante } from '../../repository/postulant/postulant.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Oferta, Postulacion, Postulante])],
  controllers: [MatchController],
  providers: [MatchService],
  exports: [MatchService],
})
export class MatchModule {}
