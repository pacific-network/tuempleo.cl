
import { Controller, Post, Body, HttpCode, HttpStatus, Get } from '@nestjs/common';
import { PostulacionService } from '../../modules/applications/application.service';
import { CreatePostulacionDto } from './dto/create-postulacion.dto';
import { Postulacion } from '../../repository/applications/applications.entity';

@Controller('v1/postulaciones')
export class PostulacionController {
    constructor(private readonly postulacionService: PostulacionService) { }

    @Post()
    @HttpCode(HttpStatus.CREATED)
    async crear(@Body() dto: CreatePostulacionDto): Promise<Postulacion> {
        return this.postulacionService.crearPostulacion(dto);
    }

    @Get(':postulanteId')
    @HttpCode(HttpStatus.OK)
    async obtenerPorPostulante(@Body('postulanteId') postulanteId: number): Promise<Postulacion[]> {
        return this.postulacionService.obtenerPostulacionesPorPostulante(postulanteId);
    }

    @Get('oferta/:ofertaId')
    @HttpCode(HttpStatus.OK)
    async obtenerPorOferta(@Body('ofertaId') ofertaId: number): Promise<Postulacion[]> {
        return this.postulacionService.obtenerPostulacionesPorOferta(ofertaId);
    }
}
