import { IsInt, IsOptional, IsObject } from 'class-validator';

export class CreatePostulacionDto {
  @IsInt()
  postulante_id: number;

  @IsInt()
  oferta_id: number;

  @IsOptional()
  @IsObject()
  data?: Record<string, any>; // opcionalmente se pueden enviar respuestas/preguntas
}
