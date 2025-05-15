import { IsNotEmpty, IsNumber, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { PlanDataDto } from './create-plan.dto';

export class UpdatePlansDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => PlanDataDto)
  descripcion?: PlanDataDto;

  @IsOptional()
  @IsNumber()
  precio?: number;
}
