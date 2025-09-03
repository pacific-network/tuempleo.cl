// src/modules/company-reviews/dto/create-company-review.dto.ts
import { IsIn, IsObject, IsOptional, IsString, Validate } from 'class-validator';

class RatingsValidator {
  validate(obj: any) {
    if (!obj || typeof obj !== 'object') return false;
    const ks = Object.keys(obj);
    if (ks.length < 3) return false;                  // esperamos 3 dimensiones
    return ks.every(k => Number.isInteger(obj[k]) && obj[k] >= 1 && obj[k] <= 5);
  }
  defaultMessage() { return 'data debe contener estrellas enteras 1..5 válidas'; }
}

export class CreateCompanyReviewDto {
  @IsIn(['trabajo','postulacion'])
  type: 'trabajo' | 'postulacion';

  // {ambiente,beneficios,cultura} o {claridad,entrevista,tiempo}
  @IsObject()
  @Validate(RatingsValidator)
  data: Record<string, number>;

  // NUEVO: motivo fuera de data
  @IsString()
  motivo: string;

  // NUEVO: detalle opcional cuando el motivo sea “otro”
  @IsOptional() @IsString()
  motivo_extra?: string;

  @IsOptional() @IsString()
  comentario?: string;
}
