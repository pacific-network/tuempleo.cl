import { Controller, Get, Param } from '@nestjs/common';
import { SiiService } from './sii.service';

@Controller('sii')
export class SiiController {
    constructor(private readonly siiService: SiiService) { }

    @Get('situacion-tributaria/:rut')
    async obtenerSituacionTributaria(@Param('rut') rut: string) {
        return await this.siiService.consultarSituacionTributaria(rut);
    }
}
