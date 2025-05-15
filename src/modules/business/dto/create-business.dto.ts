import { Type } from "class-transformer";
import { IsArray, IsBoolean, IsDate, IsNotEmpty, IsNotEmptyObject, IsNumber, IsOptional, IsString } from "class-validator";
import { Planes } from "src/repository/plans/plans.entity";

export class BusinessDataDto {
    @IsNotEmpty()
    @IsArray()
    @IsString()
    actividades_economicas: string[];

    @IsNotEmpty()
    @IsString()
    condicion_fiscal: string;

    @IsNotEmpty()
    @IsArray()
    @IsString()
    domicilios: string[];

    @IsNotEmpty()
    @IsBoolean()
    inicio_actividades: boolean;

    @IsNotEmpty()
    @IsDate()
    fecha_inicio_actividades: Date;

    @IsNotEmpty()
    @IsBoolean()
    empresa_menor_tamano: boolean;

    @IsNotEmpty()
    @IsString()
    web_factuacion: string;

    @IsNotEmpty()
    @IsString()
    pais: string;

    @IsNotEmpty()
    @IsString()
    telefono: string;

    @IsNotEmpty()
    @IsString()
    descripcion: string;

}

export class CreateBusinessDto {
    @IsNotEmpty()
    @IsString()
    rut: string;

    @IsNotEmpty()
    @IsString()
    razon_social: string;

    @IsNotEmpty()
    @IsString()
    nombre_fantasia: string;

    @IsNotEmpty()
    @IsNumber()
    plan_id: number;


    @IsNotEmpty()
    @Type(() => BusinessDataDto)
    data: BusinessDataDto;

    @IsOptional()
    @IsNumber()
    modificado_por?: number;
}
