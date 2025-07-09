import { IsOptional, IsString } from 'class-validator';

export class UpdateOfertaDto {
    @IsOptional()
    @IsString()
    titulo?: string;

    @IsOptional()
    @IsString()
    data?: string;
}
