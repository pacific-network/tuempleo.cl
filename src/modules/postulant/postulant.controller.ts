import { Controller, Post, Body, Param, Get, HttpException, HttpStatus, UseGuards, Patch, Query } from '@nestjs/common';
import { PostulanteService } from '../postulant/postulant.service';
import { AuthGuard } from '../auth/guards/auth.guards';
import { UpdatePostulantDto } from './dto/update-postulant.dto';
import { PageOptionsDto } from 'src/shared/pagination/page-options.dto';
import { PageDto } from 'src/shared/pagination/page.dto';
import { Postulante } from 'src/repository/postulant/postulant.entity';

@Controller('v1/postulante')
export class PostulanteController {
  constructor(private readonly postulanteService: PostulanteService) { }

  // Crear postulante
  @UseGuards(AuthGuard)
  @Post(':userId')
  async crearPostulante(
    @Param('userId') userId: number,
    @Body('rut') rut: string,
    @Body('data') data: Record<string, any>
  ) {
    try {
      const postulante = await this.postulanteService.crearPostulante(userId, rut, data);
      return { message: 'Postulante creado exitosamente', postulante };
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @UseGuards(AuthGuard)
  @Get(':userId')
  async obtenerPostulante(@Param('userId') userId: number) {
    try {
      const postulante = await this.postulanteService.obtenerPostulante(userId);
      return postulante;
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.NOT_FOUND);
    }
  }

  @UseGuards(AuthGuard)
  @Patch('update/:userId')
  async updatePostulante(
    @Param('userId') userId: number,
    @Body() payload: UpdatePostulantDto
  ) {
    try {
      const postulante = await this.postulanteService.updatePostulant(payload, userId);
      return { message: 'Postulante actualizado exitosamente', postulante };
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @UseGuards(AuthGuard)
  @Get()
  async getAllPostulantes(@Query() PageOptionsDto: PageOptionsDto): Promise<PageDto<Postulante>> {
    return this.postulanteService.findAllPostulants(PageOptionsDto);
  }


}
