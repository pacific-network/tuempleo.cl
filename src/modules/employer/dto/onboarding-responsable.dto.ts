import { Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  ValidateNested,
} from 'class-validator';
import { CreateBusinessDto } from '../../business/dto/create-business.dto';

/**
 * Onboarding del empleador, en dos pasos.
 *
 * Paso 1 — el responsable (esta persona). Se guarda antes de que exista
 * ninguna empresa, porque no depende de ninguna.
 * Paso 2 — una empresa, repetible: se puede agregar más de una.
 */

export class ResponsableDataDto {
  @IsNotEmpty()
  @IsString()
  pais: string;

  @IsNotEmpty()
  @IsString()
  region: string;

  @IsNotEmpty()
  @IsString()
  comuna: string;

  @IsNotEmpty()
  @IsString()
  direccion: string;

  @IsNotEmpty()
  @IsString()
  @Matches(/^\+56\d{9}$/, {
    message: 'telefono debe tener formato +56XXXXXXXXX (12 caracteres)',
  })
  telefono: string;

  @IsOptional() @IsString() facebook?: string;
  @IsOptional() @IsString() instagram?: string;
  @IsOptional() @IsString() linkedin?: string;
  @IsOptional() @IsString() twitter?: string;
}

/** Paso 1: quién es el responsable. Sin empresa todavía. */
export class GuardarResponsableDto {
  @IsNotEmpty()
  @IsString()
  nombres: string;

  @IsNotEmpty()
  @IsString()
  apellidos: string;

  @IsNotEmpty()
  @IsString()
  rut: string;

  @ValidateNested()
  @Type(() => ResponsableDataDto)
  data: ResponsableDataDto;
}

/**
 * Paso 2: una empresa. El `cargo` es de esta membresía, no de la persona:
 * el mismo responsable puede ser gerente en una empresa y socio en otra.
 */
export class AgregarEmpresaDto {
  @ValidateNested()
  @Type(() => CreateBusinessDto)
  business: CreateBusinessDto;

  @IsNotEmpty()
  @IsString()
  cargo: string;
}
