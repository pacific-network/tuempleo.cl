import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateBugDto {
    @ApiProperty({ example: 'No puedo subir mi CV' })
    @IsNotEmpty()
    @IsString()
    @MaxLength(255)
    titulo: string;

    @ApiProperty({ example: 'Al hacer click en "Subir CV" no pasa nada y queda cargando.' })
    @IsNotEmpty()
    @IsString()
    descripcion: string;

    @ApiProperty({ example: '/postulante/curriculum' })
    @IsNotEmpty()
    @IsString()
    @MaxLength(500)
    pagina: string;
}
