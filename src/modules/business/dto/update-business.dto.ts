import {
    IsOptional,
    IsString,
    IsArray,
    IsUrl,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateBusinessDto {
    @ApiProperty({ example: 'ACME Tech', required: false })
    @IsOptional()
    @IsString()
    nombre_fantasia?: string;

    @ApiProperty({ example: '+56912345678', required: false })
    @IsOptional()
    @IsString()
    telefono?: string;

    @ApiProperty({ type: [String], example: ['Av. Providencia 123'], required: false })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    domicilios?: string[];

    @ApiProperty({ example: 'Empresa innovadora en soluciones TI', required: false })
    @IsOptional()
    @IsString()
    descripcion?: string;

    @ApiProperty({ example: 'https://factura.empresa.cl', required: false })
    @IsOptional()
    @IsUrl()
    web_factuacion?: string;

    @ApiProperty({ example: 'https://cdn.miapp.cl/logo.png', required: false })
    @IsOptional()
    @IsString()
    logo_url?: string;
    
}
