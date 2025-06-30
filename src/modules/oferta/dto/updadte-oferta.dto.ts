import { PartialType } from '@nestjs/mapped-types'; // o '@nestjs/swagger' si estás generando Swagger docs
import { CreateOfertaDto } from './create-oferta.dto';

export class UpdateOfertaDto extends PartialType(CreateOfertaDto) { }