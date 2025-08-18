import { IsOptional, IsString, IsArray, IsIn, IsInt, Min, Max } from 'class-validator';
import { Transform, Type } from 'class-transformer';

const toArray = (v: any) => {
  if (v === undefined || v === null || v === '') return undefined;
  if (Array.isArray(v)) return v.filter(Boolean).map(String);
  return String(v).split(',').map(s => s.trim()).filter(Boolean);
};

export class FilterOfertasDto {
  // (Opcional) Si ya usas PageOptionsDto para paginar, puedes ignorar estos
  @Type(() => Number) @IsInt() @Min(1) @IsOptional() page?: number;
  @Type(() => Number) @IsInt() @Min(1) @Max(50) @IsOptional() take?: number;

  /** Búsqueda libre (acepta q o searchQuery) */
  @IsOptional() @IsString() q?: string;
  @IsOptional() @IsString() searchQuery?: string;

  /** Filtros base */
  @IsOptional() @IsString() region?: string;     // oferta.data.region (o el valor que guardes ahí)
  @IsOptional() @IsString() comuna?: string;     // oferta.data.comuna
  @IsOptional() @IsString() categoria?: string;  // oferta.data.area_trabajo

  /** Modalidad: CSV -> array (1=Full, 2=Part, 3=Remoto, 4=Freelance, 5=Híbrido) */
  @IsOptional() @Transform(({ value }) => toArray(value)) @IsArray() modalidad?: string[];

  /** Extras */
  @Type(() => Number) @IsInt() @IsOptional() expMin?: number;     // data.anios_experiencia >=
  @Type(() => Number) @IsInt() @IsOptional() expMax?: number;     // data.anios_experiencia <=
  @Type(() => Number) @IsInt() @IsOptional() salarioMin?: number; // cruce de rangos
  @Type(() => Number) @IsInt() @IsOptional() salarioMax?: number; // cruce de rangos

  @IsOptional() @IsString() expiraAntes?: string;    // oferta.fecha_cierre <=
  @IsOptional() @IsString() expiraDespues?: string;  // oferta.fecha_cierre >=

  /** Publicadas hace… (fecha_publicacion) */
  @IsOptional() @IsIn(['24h','7d','30d','60d','recientes','todos'])
  posted?: '24h'|'7d'|'30d'|'60d'|'recientes'|'todos';

  /** Orden */
  @IsOptional() @IsIn(['fecha_publicacion','fecha_cierre'])
  sortBy?: 'fecha_publicacion'|'fecha_cierre';
  @IsOptional() @IsIn(['ASC','DESC'])
  order?: 'ASC'|'DESC';
}
