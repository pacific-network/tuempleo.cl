import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { AlertAudiencia } from 'src/repository/system-alert/system-alert.entity';

export class CreateAlertDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  titulo: string;

  @IsString()
  @IsNotEmpty()
  mensaje: string;

  @IsOptional()
  @IsEnum(AlertAudiencia)
  audiencia?: AlertAudiencia;

  @IsOptional()
  @IsBoolean()
  activa?: boolean;

  @IsOptional()
  @IsDateString()
  fecha_inicio?: string;

  @IsOptional()
  @IsDateString()
  fecha_fin?: string;
}
