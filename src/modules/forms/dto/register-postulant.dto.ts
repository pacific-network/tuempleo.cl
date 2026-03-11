import { IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { PostulantDataDto } from '../../postulant/dto/create-postulant.dto';

export class RegisterPostulantDto {
  @IsNotEmpty()
  @IsString()
  rut: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => PostulantDataDto)
  data?: PostulantDataDto;
}
