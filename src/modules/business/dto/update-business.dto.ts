import {
    IsOptional,
    IsString,
    IsArray,
    IsUrl,
    Matches,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateBusinessDto {
    @ApiProperty({ example: 'ACME Tech', required: false })
    @IsOptional()
    @IsString()
    nombre_fantasia?: string;

    @ApiProperty({ example: '+56988440465', required: false })
    @IsOptional()
    @IsString()
    @Matches(/^\+56\d{9}$/, { message: 'telefono debe tener formato +56XXXXXXXXX (12 caracteres)' })
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
