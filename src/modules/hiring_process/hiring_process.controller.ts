import { Body , Controller, Post, Param, ParseIntPipe, Req } from '@nestjs/common';
import { ProcesoSeleccionService } from './hiring_process.service';

@Controller('seleccion')
export class ProcesoSeleccionController {
    constructor(private readonly seleccionService: ProcesoSeleccionService) { }

    @Post(':postulacionId/preseleccionar')
    preseleccionar(
        @Param('postulacionId', ParseIntPipe) postulacionId: number,
        @Req() req,
    ) {
        const empleadorId = req.user.id; // Asumiendo JWT con user
        return this.seleccionService.gestionarSeleccion(postulacionId, empleadorId, 'preseleccionado');
    }

    @Post(':postulacionId/descartar')
    descartar(
        @Param('postulacionId', ParseIntPipe) postulacionId: number,
        @Req() req,
    ) {
        const empleadorId = req.user.id;
        return this.seleccionService.gestionarSeleccion(postulacionId, empleadorId, 'descartado');
    }

    @Post(':postulacionId/contratar')
    contratar(
        @Param('postulacionId', ParseIntPipe) postulacionId: number,
        @Req() req,
    ) {
        const empleadorId = req.user.id;
        return this.seleccionService.gestionarSeleccion(postulacionId, empleadorId, 'contratado');
    }
}
