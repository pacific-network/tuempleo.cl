
import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
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
}
