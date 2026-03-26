import { Controller, Get, Query } from '@nestjs/common';
import { SalaryStatsService } from './salary-stats.service';
import { SalaryStatsQueryDto } from './dto/salary-stats-query.dto';

@Controller('v1/estadisticas')
export class SalaryStatsController {
  constructor(private readonly salaryStatsService: SalaryStatsService) {}

  @Get('salarios')
  async getSalaryStats(@Query() query: SalaryStatsQueryDto) {
    return this.salaryStatsService.getSalaryStats(
      query.region,
      query.categoria,
    );
  }
}
