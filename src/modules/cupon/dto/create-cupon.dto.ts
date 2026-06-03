import { Type } from 'class-transformer';
import {
    ArrayMinSize,
    IsArray,
    IsBoolean,
    IsDateString,
    IsEnum,
    IsInt,
    IsNotEmpty,
    IsOptional,
    IsString,
    Matches,
    MaxLength,
    Min,
    ValidateNested,
} from 'class-validator';

export class CuponLineaDto {
    @IsEnum(['BASICO', 'ESTANDAR', 'PREMIUM'])
    tipoAviso: 'BASICO' | 'ESTANDAR' | 'PREMIUM';

    @IsInt()
    @Min(1)
    cantidad: number;
}

export class CreateCuponDto {
    @IsString()
    @IsNotEmpty()
    @MaxLength(150)
    nombre: string;

    // Opcional: si no se envía, el backend genera uno automáticamente.
    @IsOptional()
    @IsString()
    @MaxLength(50)
    @Matches(/^[A-Za-z0-9\-_]+$/, {
        message: 'El código solo admite letras, números, guion y guion bajo',
    })
    codigo?: string;

    @IsArray()
    @ArrayMinSize(1)
    @ValidateNested({ each: true })
    @Type(() => CuponLineaDto)
    lineas: CuponLineaDto[];

    @IsOptional()
    @IsInt()
    @Min(1)
    dias_vigencia?: number;

    @IsOptional()
    @IsDateString()
    fecha_expiracion?: string;

    // null/ausente = ilimitado
    @IsOptional()
    @IsInt()
    @Min(1)
    max_usos?: number;

    @IsOptional()
    @IsBoolean()
    activo?: boolean;
}
