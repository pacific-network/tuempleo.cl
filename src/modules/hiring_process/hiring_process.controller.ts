import { Body, Controller, Post, Param, ParseIntPipe, Req, UseGuards, Patch, Get } from '@nestjs/common';
import { ProcesoSeleccionService } from './hiring_process.service';
import { AuthGuard } from '@nestjs/passport'; // corregido: importar desde '@nestjs/passport'

@Controller('v1/seleccion')
export class ProcesoSeleccionController {
    constructor(private readonly seleccionService: ProcesoSeleccionService) { }

    @UseGuards(AuthGuard('jwt'))
    @Patch(':postulacionId/preseleccionar')
    preseleccionar(
        @Param('postulacionId', ParseIntPipe) postulacionId: number,
        @Req() req,
    ) {
        const empleadorId = req.user.userId;  // cambio aquí: userId en vez de id
        return this.seleccionService.gestionarSeleccion(postulacionId, empleadorId, 'preseleccionado');
    }

    @UseGuards(AuthGuard('jwt'))
    @Patch(':postulacionId/descartar')
    descartar(
        @Param('postulacionId', ParseIntPipe) postulacionId: number,
        @Req() req,
    ) {
        const empleadorId = req.user.userId;
        return this.seleccionService.gestionarSeleccion(postulacionId, empleadorId, 'descartado');
    }

    @UseGuards(AuthGuard('jwt'))
    @Patch(':postulacionId/contratar')
    contratar(
        @Param('postulacionId', ParseIntPipe) postulacionId: number,
        @Req() req,
    ) {
        const empleadorId = req.user.userId;
        return this.seleccionService.gestionarSeleccion(postulacionId, empleadorId, 'contratado');
    }

    @UseGuards(AuthGuard('jwt'))
    @Patch(':postulacionId/cualificar')
    cualificar(
        @Param('postulacionId', ParseIntPipe) postulacionId: number,
        @Req() req,
    ) {
        const empleadorId = req.user.userId;
        return this.seleccionService.cualificarPostulante(postulacionId, empleadorId);
    }

    @UseGuards(AuthGuard('jwt'))
    @Get('mias')
    async misNotificaciones(@Req() req) {
        const userId = req.user.userId; // id del Usuario (postulante)
        return this.seleccionService.listarProcesosDelPostulante(userId);
    }

    @UseGuards(AuthGuard('jwt'))
    @Get('empresa/:empresaId')
    async listarPorEmpresa(@Param('empresaId') empresaId: number) {
        return this.seleccionService.listarPostulacionesPorEmpresa(Number(empresaId));
    }

 



}
