import {
    IsString,
    IsInt,
    IsDateString,
    IsBoolean,
    IsNotEmpty,
    IsOptional
} from 'class-validator';

export class CreateOfertaDto {
    @IsString()
    @IsNotEmpty()
    titulo: string;

    @IsInt()
    @IsNotEmpty()
    empresa_id: number;

    @IsInt()
    @IsNotEmpty()
    empleador_id: number;

    @IsDateString()
    fecha_publicacion: Date;

    @IsInt()
    duracion_publicacion: number;

    @IsBoolean()
    @IsOptional()
    es_activa?: boolean;

    @IsDateString()
    fecha_cierre: Date;

    @IsString()
    @IsNotEmpty()
    data: string; // JSON string (puedes usar JSON.parse si es necesario en el servicio)
}
