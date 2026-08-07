import { PartialType } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsOptional, IsString, ValidateNested } from 'class-validator';
import { DataOfertaDto } from './create-oferta.dto';

/**
 * Igual a DataOfertaDto pero con todos los campos opcionales: este endpoint es
 * un PATCH parcial, así que exigir `area_trabajo`, `modalidad` y compañía en
 * cada edición rechazaría cualquier cambio puntual.
 */
export class UpdateDataOfertaDto extends PartialType(DataOfertaDto) {}

export class UpdateOfertaDto {
    @IsOptional()
    @IsString()
    titulo?: string;

    /**
     * Antes se declaraba `data?: string` con @IsString(), mientras CreateOfertaDto
     * usa el objeto validado. Esa asimetría hacía que un cliente mandando el
     * objeto —lo natural, y lo que hace el resto del sistema— recibiera un 400
     * "data must be a string", y que un string cualquiera pasara sin validarse.
     *
     * El @Transform mantiene la compatibilidad: si llega el JSON serializado se
     * convierte a objeto antes de validar, así los clientes que ya mandaban
     * string siguen funcionando.
     */
    @IsOptional()
    @Transform(({ value }) => {
        if (typeof value !== 'string') return value;
        try {
            return JSON.parse(value);
        } catch {
            // Se devuelve el string tal cual para que la validación lo rechace
            // con un mensaje de campo en vez de tirar un 500 acá.
            return value;
        }
    })
    @ValidateNested()
    @Type(() => UpdateDataOfertaDto)
    data?: UpdateDataOfertaDto;
}
