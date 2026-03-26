import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Oferta } from '../../repository/job_offer/job-offer.entity';
import { SalaryStatsService } from './salary-stats.service';
import { SalaryStatsController } from './salary-stats.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Oferta])],
  controllers: [SalaryStatsController],
  providers: [SalaryStatsService],
})
export class SalaryStatsModule {}
