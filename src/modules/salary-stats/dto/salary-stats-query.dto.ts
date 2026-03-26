import { IsOptional, IsString } from 'class-validator';

export class SalaryStatsQueryDto {
  @IsOptional()
  @IsString()
  region?: string;

  @IsOptional()
  @IsString()
  categoria?: string;
}
