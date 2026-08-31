import { Body, Controller, Post, Param, ParseIntPipe, Req, UseGuards, Patch, Get, UsePipes, ValidationPipe } from '@nestjs/common';
import { ProcesoSeleccionService } from './hiring_process.service';
import { AuthGuard } from '@nestjs/passport'; // corregido: importar desde '@nestjs/passport'
import { MiembroDeEmpresaGuard } from '../auth/guards/miembro-empresa.guard';
import { AuthGuard as CandidatoAuthGuard } from '../auth/guards/auth.guards';
import { CrearEntrevistaDto } from './dto/crear-entrevista.dto';
import { ActualizarEntrevistaDto, CambiarEstadoEntrevistaDto } from './dto/actualizar-entrevista.dto';

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
    @Patch(':postulacionId/seleccionar')
    seleccionar(
        @Param('postulacionId', ParseIntPipe) postulacionId: number,
        @Req() req,
    ) {
        const empleadorId = req.user.userId;  // cambio aquí: userId en vez de id
        return this.seleccionService.gestionarSeleccion(postulacionId, empleadorId, 'seleccionado');
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

    // El guard es lo que faltaba: tenía JWT pero no usaba el userId, así que
    // servía las postulaciones de cualquier empresa cambiando el número.
    @UseGuards(AuthGuard('jwt'), MiembroDeEmpresaGuard)
    @Get('empresa/:empresaId')
    async listarPorEmpresa(@Param('empresaId') empresaId: number) {
        return this.seleccionService.listarPostulacionesPorEmpresa(Number(empresaId));
    }

    // ======================================================
    // 📅 ENTREVISTAS / CIERRE DEL PROCESO
    // ======================================================

    // Empleador agenda una entrevista para una postulación de su oferta.
    @UseGuards(AuthGuard('jwt'))
    @Post(':postulacionId/entrevista')
    @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
    agendarEntrevista(
        @Param('postulacionId', ParseIntPipe) postulacionId: number,
        @Body() dto: CrearEntrevistaDto,
        @Req() req,
    ) {
        return this.seleccionService.agendarEntrevista(postulacionId, req.user.userId, dto);
    }

    // Empleador reprograma / edita la entrevista.
    @UseGuards(AuthGuard('jwt'))
    @Patch('entrevista/:id')
    @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
    reprogramarEntrevista(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: ActualizarEntrevistaDto,
        @Req() req,
    ) {
        return this.seleccionService.reprogramarEntrevista(id, req.user.userId, dto);
    }

    // Empleador cambia el estado (confirmar / cancelar / completar).
    @UseGuards(AuthGuard('jwt'))
    @Patch('entrevista/:id/estado')
    @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
    cambiarEstadoEntrevista(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: CambiarEstadoEntrevistaDto,
        @Req() req,
    ) {
        return this.seleccionService.cambiarEstadoEntrevista(id, req.user.userId, dto.estado);
    }

    // Candidato: sus entrevistas (notificación in-app).
    @UseGuards(CandidatoAuthGuard)
    @Get('entrevistas/mias')
    async misEntrevistas(@Req() req) {
        return this.seleccionService.listarEntrevistasDelPostulante(req.user.sub);
    }

    // Empleador: entrevistas agendadas por su empresa.
    @UseGuards(AuthGuard('jwt'), MiembroDeEmpresaGuard)
    @Get('entrevistas/empresa/:empresaId')
    async entrevistasPorEmpresa(@Param('empresaId', ParseIntPipe) empresaId: number) {
        return this.seleccionService.listarEntrevistasPorEmpresa(empresaId);
    }

}
