import {
    IsBoolean,
    IsEnum,
    IsInt,
    IsOptional,
    Min,
} from 'class-validator';

export class UpdateWelcomePromoDto {
    @IsOptional()
    @IsBoolean()
    enabled?: boolean;

    @IsOptional()
    @IsEnum(['BASICO', 'ESTANDAR', 'PREMIUM'])
    tipoAviso?: 'BASICO' | 'ESTANDAR' | 'PREMIUM';

    @IsOptional()
    @IsInt()
    @Min(1)
    cantidad?: number;

    @IsOptional()
    @IsInt()
    @Min(1)
    dias?: number;
}
