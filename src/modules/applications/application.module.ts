import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Oferta } from 'src/repository/job_offer/job-offer.entity';
import { Postulante } from 'src/repository/postulant/postulant.entity';
import { PostulacionService } from './application.service';
import { ExportApplicantsService } from './export/export-applicants.service';
import { PostulacionController } from './application.controller';
import { Postulacion } from 'src/repository/applications/applications.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([Postulacion, Postulante, Oferta]),
    ],
    providers: [PostulacionService, ExportApplicantsService],
    controllers: [PostulacionController]
})
export class ApplicationModule { }