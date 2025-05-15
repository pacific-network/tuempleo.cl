import { Type } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';



export class PlanDataDto {
    @IsNotEmpty()
    @IsNumber()
    cantidad_avisos: number;

    @IsNotEmpty()
    @IsNumber()
    duracion_avisos: number;

    @IsNotEmpty()
    @IsNumber()
    cantidad_curriculums: number;

    @IsNotEmpty()
    @IsNumber()
    duracion_curriculums: number;

    @IsNotEmpty()
    @IsNumber()
    cantidad_postulantes: number;

    @IsNotEmpty()
    @IsNumber()
    duracion_postulantes: number;

    @IsNotEmpty()
    @IsNumber()
    cantidad_postulaciones: number;

    @IsNotEmpty()
    @IsNumber()
    duracion_postulaciones: number;

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
