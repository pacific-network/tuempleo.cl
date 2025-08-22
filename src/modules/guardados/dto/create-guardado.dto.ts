// src/modules/guardados/dto/create-guardado.dto.ts
import { IsInt, IsNotEmpty } from 'class-validator';
export class CreateGuardadoDto {
  @IsInt()
  @IsNotEmpty()
  oferta_id: number;
}
