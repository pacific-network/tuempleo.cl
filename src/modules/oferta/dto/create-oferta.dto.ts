import {
    IsString,
    IsInt,
    IsDateString,
    IsBoolean,
    IsNotEmpty,
    IsOptional,
    IsEnum,
} from 'class-validator';

export class CreateOfertaDto {
    @IsString()
    @IsNotEmpty({ message: 'El título es obligatorio.' })
    titulo: string;

    @IsEnum(['BASICO', 'ESTANDAR', 'PREMIUM'], {
        message: 'El tipo de aviso debe ser BASICO, ESTANDAR o PREMIUM.',
    })
    tipo_aviso: 'BASICO' | 'ESTANDAR' | 'PREMIUM'; // 👈 necesario para descontar del stock

    @IsInt()
    @IsNotEmpty({ message: 'Debe indicar la empresa asociada.' })
    empresa_id: number;

    @IsInt()
    @IsNotEmpty({ message: 'Debe indicar el empleador que publica la oferta.' })
    empleador_id: number;

    @IsDateString()
    @IsOptional()
    fecha_publicacion?: Date = new Date(); // se genera por defecto

    @IsInt()
    @IsOptional()
    duracion_publicacion?: number = 30;

    @IsBoolean()
    @IsOptional()
    es_activa?: boolean = true;

    @IsDateString()
    @IsOptional()
    fecha_cierre?: Date;

    @IsString()
    @IsNotEmpty({ message: 'La información de la oferta (data) es obligatoria.' })
    data: string; // JSON string (parseable)
}
