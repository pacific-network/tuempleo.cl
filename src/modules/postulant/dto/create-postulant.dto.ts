import { Type } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class PostulantDataDto {

    @IsOptional()
    datos_personales?: {
        comuna: string;
        genero: string;
        region: string;
        telefono: string;
        estado_civil: string;
        nacionalidad: string;
        fecha_nacimiento: string;
    };

    @IsOptional()
    educacion?: {
        titulo: string;
        institucion: string;
        tipo_estudio: string;
        estado: string;
        // anno_inicio: string;
        // anno_termino?: string;
        // nivel_estudio: string;
    }[];

    @IsOptional()
    experiencias?: {
        cargo: string;
        empresa: string;
        anno_inicio: string;
        descripcion: string;
        anno_termino?: string;
        nivel_experiencia: string;
    }[];

    @IsOptional()
    idiomas?: {
        idioma: string;
        nivel_oral: string;
        nivel_escrito: string;
    }[];

    @IsOptional()
    preferencias?: {
        modalidad: string;
        categoria_empleo: string;
        salario_esperado: string;
    };

    @IsOptional()
    redes_sociales?: {
        url: string;
        red_social: string;
    }[];

}

export class CreatePostulantDto {

    @IsNotEmpty()
    @IsString()
    rut: string;

    @IsNotEmpty()
    @IsNumber()
    userId: number;

    @IsOptional()
    @Type(() => PostulantDataDto)
    data?: PostulantDataDto;
}
