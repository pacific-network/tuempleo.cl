import { PartialType } from '@nestjs/swagger';
import { IsOptional } from "class-validator";
import { CreatePostulantDto, PostulantDataDto } from "./create-postulant.dto";
import { Type } from 'class-transformer';

export class UpdatePostulantDto extends PartialType(CreatePostulantDto) {

    @IsOptional()
    @Type(() => PostulantDataDto)
    data?: PostulantDataDto;
}
