import {
  Controller, Post, Body, HttpCode, HttpStatus, Get, UseGuards, Req,
  Param, ParseIntPipe, Query
} from '@nestjs/common';
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
  @Get('postulante')
  @HttpCode(HttpStatus.OK)
  async obtenerPorUsuario(@Req() req): Promise<Postulacion[]> {
    const userId = req.user.userId;
    return this.postulacionService.obtenerPostulacionesPorUsuario(userId);
  }

  // ✅ FIX: leer ofertaId desde el path param
  // @Get('oferta/:ofertaId')
  // @HttpCode(HttpStatus.OK)
  // async obtenerPorOferta(
  //   @Param('ofertaId', ParseIntPipe) ofertaId: number,
  // ): Promise<Postulacion[]> {
  //   return this.postulacionService.obtenerPostulacionesPorOferta(ofertaId);
  // }
  @Get('oferta/:ofertaId')
  @HttpCode(HttpStatus.OK)
  async obtenerPorOferta(
    @Param('ofertaId', ParseIntPipe) ofertaId: number,
    @Query('keywords') keywords?: string,  // 👈 filtro opcional
  ): Promise<Postulacion[]> {
    return this.postulacionService.obtenerPostulacionesPorOferta(ofertaId, keywords);
  }


  // ✅ total de postulantes ÚNICOS para una oferta
  @Get('oferta/:ofertaId/count')
  @HttpCode(HttpStatus.OK)
  async countUnicosPorOferta(
    @Param('ofertaId', ParseIntPipe) ofertaId: number,
  ): Promise<{ ofertaId: number; total: number }> {
    const total = await this.postulacionService.countUnicosPorOferta(ofertaId);
    return { ofertaId, total };
  }

  // ✅ lista “única” (máx. 1 registro por postulante) para una oferta
  @Get('oferta/:ofertaId/unicos')
  @HttpCode(HttpStatus.OK)
  async unicosPorOferta(
    @Param('ofertaId', ParseIntPipe) ofertaId: number,
  ): Promise<Postulacion[]> {
    return this.postulacionService.obtenerPostulacionesUnicasPorOferta(ofertaId);
  }

  // ✅ batch para la grilla: counts por varias ofertas en 1 request
  //    /v1/postulaciones/ofertas/count?ids=18,20,21
  @Get('ofertas/count')
  @HttpCode(HttpStatus.OK)
  async countsPorOfertas(
    @Query('ids') ids: string,
  ): Promise<Record<number, number>> {
    const ofertaIds = (ids || '')
      .split(',')
      .map(s => parseInt(s.trim(), 10))
      .filter(n => Number.isFinite(n));
    return this.postulacionService.countDistinctByOfertaIds(ofertaIds);
  }

  @Get('oferta/:id/cualificados')
  @UseGuards(AuthGuard('jwt'))
  async obtenerCualificados(
    @Param('id') ofertaId: number,
    @Req() req
  ) {
    const userId = req.user.userId;

    return this.postulacionService.obtenerPostulantesCualificados(ofertaId, userId);
  }

  @Get('oferta/:id/preseleccionados')
  @UseGuards(AuthGuard('jwt'))
  async obtenerPreseleccionados(
    @Param('id') ofertaId: number,
    @Req() req
  ) {
    const userId = req.user.userId;

    return this.postulacionService.ObtenerPostulantesPreseleccionados(ofertaId, userId);
  }

}
