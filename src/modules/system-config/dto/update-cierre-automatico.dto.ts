import {
    IsBoolean,
    IsInt,
    IsOptional,
    IsString,
    Max,
    Min,
} from 'class-validator';

export class UpdateCierreAutomaticoDto {
    @IsOptional()
    @IsBoolean()
    enabled?: boolean;

    @IsOptional()
    @IsInt()
    @Min(7)
    @Max(180)
    diasInactividad?: number;

    @IsOptional()
    @IsInt()
    @Min(1)
    @Max(30)
    diasGraciaAvanzados?: number;

    @IsOptional()
    @IsBoolean()
    notificarEmail?: boolean;

    @IsOptional()
    @IsString()
    messageIdCandidato?: string | null;

    @IsOptional()
    @IsString()
    messageIdEmpleador?: string | null;

    // Techo por ejecución: protege la reputación del dominio en el primer
    // barrido, cuando el histórico acumulado se cierra de golpe.
    @IsOptional()
    @IsInt()
    @Min(1)
    @Max(5000)
    maxCorreosPorEjecucion?: number;
}
