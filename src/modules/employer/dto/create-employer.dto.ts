// src/modules/forms/dto/create-employer.dto.ts

import { Type } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';

export class EmployerDataDto {
    @IsNotEmpty()
    @IsString()
    cargo: string;

    @IsNotEmpty()
    @IsString()
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

    @IsNotEmpty()
    @IsNumber()
    userId: number;

    @IsOptional()
    @IsNumber()
    empresaId: number; // <- Necesario para asociar al empleador

    @IsOptional()
    @ValidateNested()
    @Type(() => EmployerDataDto)
    data?: EmployerDataDto;
}
