import { IsInt, IsString } from 'class-validator';

export class ConsumeQuotaDto {
    @IsInt()
    empresa_id: number;

    @IsInt()
    oferta_id: number;

    @IsInt()
    usuario_id: number;

    @IsString()
    action: 'unlock' | 'download'; // 🔓 desbloqueo | ⬇ descarga
}
