import { IsInt, IsOptional, IsObject, IsString, IsIn } from 'class-validator';

export class CreatePostulacionDto {
  @IsInt()
  postulante_id: number;

  @IsInt()
  oferta_id: number;

  @IsOptional()
  @IsObject()
  data?: Record<string, any>;

}
