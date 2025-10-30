import { Type } from "class-transformer";
import {
    IsArray,
    IsBoolean,
    IsDate,
    IsNotEmpty,
    IsOptional,
    IsNumber,
    IsString,
} from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class BusinessDataDto {
    @ApiProperty({ type: [String], example: ['Servicios TI', 'Consultoría'] })
    @IsNotEmpty()
    @IsArray()
    @IsString({ each: true })
    actividades_economicas: string[];

    @ApiProperty({ example: 'General' })
    @IsNotEmpty()
    @IsString()
    condicion_fiscal: string;

    @ApiProperty({ type: [String], example: ['Av. Providencia 123, Santiago'] })
    @IsNotEmpty()
    @IsArray()
    @IsString({ each: true })
    domicilios: string[];

    @ApiProperty({ example: true })
    @IsNotEmpty()
    @IsBoolean()
    inicio_actividades: boolean;

    @ApiProperty({ example: '2024-01-01' })
    @IsNotEmpty()
    @IsDate()
    @Type(() => Date)
    fecha_inicio_actividades: Date;

    @ApiProperty({ example: false })
    @IsNotEmpty()
    @IsBoolean()
    empresa_menor_tamano: boolean;

    @ApiProperty({ example: 'https://factura.tuempresa.cl' })
    @IsNotEmpty()
    @IsString()
    web_factuacion: string;

    @ApiProperty({ example: 'Chile' })
    @IsNotEmpty()
    @IsString()
    pais: string;

    @ApiProperty({ example: '+56912345678' })
    @IsNotEmpty()
    @IsString()
    telefono: string;

    @ApiProperty({ example: 'Empresa dedicada a servicios tecnológicos' })
    @IsNotEmpty()
    @IsString()
    descripcion: string;
    
}

export class CreateBusinessDto {
    @ApiProperty({ example: '12345678-9' })
    @IsNotEmpty()
    @IsString()
    rut: string;

    @ApiProperty({ example: 'Tecnologías ACME SpA' })
    @IsOptional()
    @IsString()
    razon_social: string;

    @ApiProperty({ example: 'ACME Tech' })
    @IsOptional()
    @IsString()
    nombre_fantasia: string;

    @ApiProperty({ example: 1 })

    @IsOptional()
    @IsNumber()
    plan_id: number;

    @ApiProperty({ type: BusinessDataDto })
    @IsNotEmpty()
    @Type(() => BusinessDataDto)
    data: BusinessDataDto;

    @ApiProperty({ example: 42, required: false })
    @IsOptional()
    @IsNumber()
    modificado_por?: number;
}
