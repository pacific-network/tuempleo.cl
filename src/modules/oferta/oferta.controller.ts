import { Controller, Post, Body, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { OfertaService } from './oferta.service';
import { CreateOfertaDto } from './dto/create-oferta.dto';
import { Oferta } from '../../repository/job_offer/job-offer.entity';
import { PageOptionsDto } from 'src/shared/pagination/page-options.dto';
import { PageDto } from 'src/shared/pagination/page.dto';

@Controller('v1/ofertas')
export class OfertaController {
    constructor(private readonly ofertaService: OfertaService) { }

    @Post()
    async crearOferta(@Body() dto: CreateOfertaDto): Promise<Oferta> {
        return this.ofertaService.crearOferta(dto);
    }

    @Get()
    async listarOfertas(): Promise<Oferta[]> {
        return this.ofertaService.obtenerOfertas();
    }


    @Get(':id')
    async obtenerOfertaPorId(@Param('id', ParseIntPipe) id: number) {
        return this.ofertaService.obtenerOfertaPorId(id);
    }

    // @Get('empleador/:empleadorId')
    // async obtenerOfertasPorEmpleador(@Param('empleadorId', ParseIntPipe) empleadorId: number): Promise<Oferta[]> {
    //     return this.ofertaService.obtenerOfertasPorEmpleador(empleadorId);
    // }
    @Get('empleador/:empleadorId')
    async obtenerOfertasPorEmpleador(
        @Param('empleadorId') empleadorId: number,
        @Query() pageOptionsDto: PageOptionsDto
    ): Promise<PageDto<Oferta>> {
        return this.ofertaService.obtenerOfertasPorEmpleador(empleadorId, pageOptionsDto);
    }
}
