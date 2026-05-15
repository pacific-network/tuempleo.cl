import { Controller, Get, Param } from '@nestjs/common';
import { SiiService } from './sii.service';
import { SiiScraperService } from './sii-scraper.service';

@Controller('v1/sii')
export class SiiController {
    constructor(
        private readonly siiService: SiiService,
        private readonly siiScraperService: SiiScraperService,
    ) { }

    @Get('situacion-tributaria/:rut')
    async obtenerSituacionTributaria(@Param('rut') rut: string) {
        return await this.siiService.consultarSituacionTributaria(rut);
    }

    @Get('situacion-tributaria-scraper/:rut')
    async obtenerSituacionTributariaScraper(@Param('rut') rut: string) {
        return await this.siiScraperService.consultarSituacionTributaria(rut);
    }
}
