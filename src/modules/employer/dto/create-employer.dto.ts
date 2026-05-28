// src/modules/forms/dto/create-employer.dto.ts

import { Type } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsOptional, IsString, Matches, ValidateNested } from 'class-validator';

export class EmployerDataDto {

    @IsNotEmpty()
    @IsString()
    pais: string;

    @IsNotEmpty()
    @IsString()
    region: string;

    @IsNotEmpty()
    @IsString()
    comuna: string;

    @IsNotEmpty()
    @IsString()
    direccion: string;

    @IsNotEmpty()
    @IsString()
    cargo: string;

    @IsNotEmpty()
    @IsString()
    @Matches(/^\+56\d{9}$/, { message: 'telefono debe tener formato +56XXXXXXXXX (12 caracteres)' })
    telefono: string;

    @IsOptional()
    @IsString()
    facebook?: string;

    @IsOptional()
    @IsString()
    instagram?: string;

    @IsOptional()
    @IsString()
    linkedin?: string;

    @IsOptional()
    @IsString()
    twitter?: string;


}

export class CreateEmployerDto {
    @IsNotEmpty()
    @IsString()
    rut: string;

    @IsOptional()
    @IsNumber()
    userId?: number

    @IsOptional()
    @IsNumber()
    empresaId: number; // <- Necesario para asociar al empleador

    @IsOptional()
    @ValidateNested()
    @Type(() => EmployerDataDto)
    data?: EmployerDataDto;
}
