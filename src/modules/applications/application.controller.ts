
import { Controller, Post, Body, HttpCode, HttpStatus, Get, UseGuards, Req } from '@nestjs/common';
import { PostulacionService } from '../../modules/applications/application.service';
import { CreatePostulacionDto } from './dto/create-postulacion.dto';
import { Postulacion } from '../../repository/applications/applications.entity';
import { AuthGuard } from '@nestjs/passport';

@Controller('v1/postulaciones')
export class PostulacionController {
    constructor(private readonly postulacionService: PostulacionService) { }

    @Post()
    @HttpCode(HttpStatus.CREATED)
    async crear(@Body() dto: CreatePostulacionDto): Promise<Postulacion> {
        return this.postulacionService.crearPostulacion(dto);
    }

    @UseGuards(AuthGuard('jwt'))
    @Get('postulante')  // ruta fija sin parámetro en URL
    @HttpCode(HttpStatus.OK)
    async obtenerPorUsuario(@Req() req): Promise<Postulacion[]> {
        const userId = req.user.userId;  // extrae userId del token JWT

        console.log('Usuario autenticado ID:', userId);

        return this.postulacionService.obtenerPostulacionesPorUsuario(userId);
    }

    @Get('oferta/:ofertaId')
    @HttpCode(HttpStatus.OK)
    async obtenerPorOferta(@Body('ofertaId') ofertaId: number): Promise<Postulacion[]> {
        return this.postulacionService.obtenerPostulacionesPorOferta(ofertaId);
    }
}
