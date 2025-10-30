import { IsIn, IsOptional, IsString } from 'class-validator';

export class CreatePreferenceDto {
  @IsString()
  @IsIn(['BASICO', 'ESTANDAR', 'PREMIUM'])
  tipo: 'BASICO' | 'ESTANDAR' | 'PREMIUM';

  // Opcionalmente puedes asociar el aviso/orden para guardarlo luego
  @IsOptional()
  @IsString()
  referencia?: string; // ej: id_aviso, id_orden, etc.
}
