import { Transform, Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  ValidateNested,
} from 'class-validator';

/* ============================
   SUB-CLASES INTERNAS ROBUSTAS
=============================== */

class DatosPersonalesDto {
  @IsOptional()
  @IsString()
  direccion?: string;

  @IsString()
  comuna: string;

  @IsString()
  genero: string;

  @IsString()
  region: string;

  @IsString()
  @Matches(/^\+56\d{9}$/, { message: 'telefono debe tener formato +56XXXXXXXXX (12 caracteres)' })
  telefono: string;

  @IsString()
  estado_civil: string;

  @IsString()
  nacionalidad: string;

  @IsString()
  fecha_nacimiento: string;
}

class EducacionDto {
  @IsString()
  titulo: string;

  @IsOptional()
  @IsString()
  institucion?: string;

  @IsString()
  grado: string;

  @IsOptional()
  @IsString()
  estado?: string;

  // Misma convención que ExperienciaDto (anno_inicio/anno_termino): antes eran
  // anio_inicio/anio_finalizacion y la discrepancia rompía el formulario.
  // Los registros viejos se renombran con `npm run migrate:educacion-annos`.
  @IsOptional()
  @IsString()
  anno_inicio?: string;

  @IsOptional()
  @IsString()
  anno_termino?: string;
}

class ExperienciaDto {
  @IsString()
  cargo: string;

  @IsString()
  empresa: string;

  @IsString()
  anno_inicio: string;

  @IsString()
  descripcion: string;

  @IsOptional()
  @IsString()
  anno_termino?: string;

  @IsString()
  nivel_experiencia: string;
}

class IdiomaDto {
  @IsString()
  idioma: string;

  @IsString()
  nivel_oral: string;

  @IsString()
  nivel_escrito: string;
}

class PreferenciasDto {
  @IsString()
  modalidad: string;

  @IsString()
  categoria_empleo: string;

  // Llega como string desde el input del formulario. El Transform normaliza el
  // vacío a undefined para que @IsOptional lo acepte: Number('') daría 0, y un
  // candidato que no declara pretensión salarial no debe guardar 0.
  @IsOptional()
  @Transform(({ value }) =>
    value === '' || value === null || value === undefined ? undefined : Number(value),
  )
  @IsNumber()
  salario_esperado?: number;

  @IsOptional()
  @IsString()
  objetivo_laboral?: string;
}

class RedSocialDto {
  @IsString()
  url: string;

  @IsString()
  red_social: string;
}

/* ============================
       DTO PRINCIPAL
=============================== */

export class PostulantDataDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => DatosPersonalesDto)
  datos_personales?: DatosPersonalesDto;

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => EducacionDto)
  educacion?: EducacionDto[];

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ExperienciaDto)
  experiencias?: ExperienciaDto[];

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => IdiomaDto)
  idiomas?: IdiomaDto[];

  @IsOptional()
  @ValidateNested()
  @Type(() => PreferenciasDto)
  preferencias?: PreferenciasDto;

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => RedSocialDto)
  redes_sociales?: RedSocialDto[];

  @IsOptional()
  @IsString({ each: true })
  herramientas?: string[];
}

export class CreatePostulantDto {
  @IsNotEmpty()
  @IsString()
  rut: string;

  @IsNotEmpty()
  @IsNumber()
  userId: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => PostulantDataDto)
  data?: PostulantDataDto;
}
