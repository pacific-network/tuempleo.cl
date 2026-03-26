import {
  Controller, Post, Body, HttpCode, HttpStatus, Get, UseGuards, Req, Res,
  Param, ParseIntPipe, Query
} from '@nestjs/common';
import { Response } from 'express';
import { PostulacionService } from '../../modules/applications/application.service';
import { ExportApplicantsService } from './export/export-applicants.service';
import { CreatePostulacionDto } from './dto/create-postulacion.dto';
import { Postulacion } from '../../repository/applications/applications.entity';
import { AuthGuard } from '@nestjs/passport';
import { AuthGuard as CustomAuthGuard } from '../auth/guards/auth.guards';

@Controller('v1/postulaciones')
export class PostulacionController {
  constructor(
    private readonly postulacionService: PostulacionService,
    private readonly exportService: ExportApplicantsService,
  ) { }

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

  @Get('oferta/:id/seleccionados')
  @UseGuards(AuthGuard('jwt'))
  async obtenerSeleccionados(
    @Param('id') ofertaId: number,
    @Req() req
  ) {
    const userId = req.user.userId;

    return this.postulacionService.ObtenerPostulantesSeleccionados(ofertaId, userId);
  }

  @Get('oferta/:id/contratados')
  @UseGuards(AuthGuard('jwt'))
  async obtenerContratados(
    @Param('id') ofertaId: number,
    @Req() req
  ) {
    const userId = req.user.userId;

    return this.postulacionService.ObtenerPostulantesContratados(ofertaId, userId);
  }

  @Get('oferta/:id/descartados')
  @UseGuards(AuthGuard('jwt'))
  async obtenerDescartados(
    @Param('id') ofertaId: number,
    @Req() req
  ) {
    const userId = req.user.userId;

    return this.postulacionService.ObtenerPostulantesDescartados(ofertaId, userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('oferta/:ofertaId/export-csv')
  async exportApplicants(
    @Param('ofertaId', ParseIntPipe) ofertaId: number,
    @Query('format') format: 'xlsx' | 'csv',
    @Req() req,
    @Res() res: Response,
  ) {
    const userId = req.user.userId;
    const fmt = format === 'csv' ? 'csv' : 'xlsx';
    const buffer = await this.exportService.exportApplicants(ofertaId, userId, fmt);

    const contentType =
      fmt === 'csv'
        ? 'text/csv'
        : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    const ext = fmt === 'csv' ? 'csv' : 'xlsx';

    res.setHeader('Content-Type', contentType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="postulantes-oferta-${ofertaId}.${ext}"`,
    );
    res.send(buffer);
  }
}
