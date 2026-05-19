import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Oferta } from '../../repository/job_offer/job-offer.entity';
import { SeoController } from './seo.controller';
import { SeoService } from './seo.service';

@Module({
  imports: [TypeOrmModule.forFeature([Oferta])],
  controllers: [SeoController],
  providers: [SeoService],
})
export class SeoModule {}
