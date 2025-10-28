import { IsIn, IsOptional, IsString } from 'class-validator';

export class CreatePreferenceDto {
  @IsString()
  @IsIn(['BASICA', 'ESTANDAR', 'PREMIUM'])
  tipo: 'BASICA' | 'ESTANDAR' | 'PREMIUM';

  // Opcionalmente puedes asociar el aviso/orden para guardarlo luego
  @IsOptional()
  @IsString()
  referencia?: string; // ej: id_aviso, id_orden, etc.
}
