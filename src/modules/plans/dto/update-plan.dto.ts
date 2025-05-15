import { IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';
import { CreatePlansDto, PlanDataDto } from './create-plan.dto';
import { Type } from 'class-transformer';

export class UpdatePlansDto extends PartialType(CreatePlansDto) {
  @IsOptional()
  @ValidateNested()
  @Type(() => PlanDataDto)
  descripcion?: PlanDataDto;

  @IsOptional()
  @IsNumber()
  precio?: number;


}
