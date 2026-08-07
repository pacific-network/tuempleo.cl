// src/modules/employer/dto/update-employer.dto.ts

import { IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { PartialType } from '@nestjs/swagger';
import { EmployerDataDto } from './create-employer.dto';

/** EmployerDataDto con todos los campos opcionales: el PATCH es parcial. */
export class UpdateEmployerDataDto extends PartialType(EmployerDataDto) {}

/**
 * PATCH /v1/empleador/data
 *
 * Antes esto declaraba `@ValidateNested()` contra EmployerDataDto, que es el DTO
 * de creación y exige `pais`, `region`, `comuna`, `direccion`, `cargo` y
 * `telefono`. Editar un solo campo devolvía 400 con cinco errores de campos que
 * el usuario no había tocado, el service nunca llegaba a correr y el perfil no
 * se guardaba: "pide que tenga todo" y "no persiste" eran el mismo bug.
 *
 * Se conserva @ValidateNested porque el formulario manda exactamente las diez
 * claves declaradas en EmployerDataDto (ver UpdateEmployerDataRequest en el
 * front) y ninguna más: no hay riesgo de que `forbidNonWhitelisted` rechace un
 * campo desconocido, y a cambio se sigue validando el formato del teléfono.
 *
 * Lo que no se valida es el *significado* del valor: nada impide guardar
 * `region: "Seleccione una región"`, el placeholder del select. Eso se corrige
 * en el formulario del front, no acá.
 */
export class UpdateEmployerDto {
    @IsOptional()
    @ValidateNested()
    @Type(() => UpdateEmployerDataDto)
    data?: UpdateEmployerDataDto;
}
