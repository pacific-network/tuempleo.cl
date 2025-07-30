import { IsOptional, IsString } from 'class-validator';

export class SearchOfertaDto {
    @IsOptional()
    @IsString()
    region?: string;

    @IsOptional()
    @IsString()
    comuna?: string;

    @IsOptional()
    @IsString()
    categoria?: string;

    @IsOptional()
    @IsString()
    modalidad?: string;

    @IsOptional()
    @IsString()
    searchQuery?: string; // ← ✅ Agregar este campo
}
