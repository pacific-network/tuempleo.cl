import { PartialType } from '@nestjs/mapped-types'; // o '@nestjs/swagger' si estás generando Swagger docs
import { CreateOfertaDto } from './create-oferta.dto';
import { IsInt, IsOptional } from 'class-validator';

export class UpdateOfertaDto extends PartialType(CreateOfertaDto) {
    @IsOptional()
    @IsInt()
    modificada_por?: number;
}

