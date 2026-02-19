import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateAlertaDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  keywords?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  categoria?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  modalidad?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  region?: string;

  @IsOptional()
  @IsIn(['diaria', 'semanal'])
  frecuencia?: 'diaria' | 'semanal';
}
