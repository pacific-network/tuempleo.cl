import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class RegisterPostulantDto {
  @IsNotEmpty()
  @IsString()
  rut: string;

  @IsOptional()
  data?: Record<string, any>;
}
