import { Type } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class PlanDataDto {

    @IsNotEmpty()
    descripcion: {
        cantidad_avisos: number;
        duracion_avisos: number;
        cantidad_curriculums: number;
        duracion_curriculums: number;
        cantidad_postulantes: number;
        duracion_postulantes: number;
        cantidad_postulaciones: number;
        duracion_postulaciones: number;
    }
}

export class CreatePlansDto {
    @IsNotEmpty()
    @IsString()
    nombre: string;

    @IsNotEmpty()
    @Type(() => PlanDataDto)
    descripcion: PlanDataDto;

    @IsNotEmpty()
    @IsNumber()
    precio: number;

    @IsOptional()
    @IsNumber()
    modificado_por?: number;

}
