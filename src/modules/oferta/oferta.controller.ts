import { Controller, Post, Body, Get, Param, ParseIntPipe, Query, Delete, UseGuards, Patch } from '@nestjs/common';
import { OfertaService } from './oferta.service';
import { CreateOfertaDto } from './dto/create-oferta.dto';
import { Oferta } from '../../repository/job_offer/job-offer.entity';
import { PageOptionsDto } from 'src/shared/pagination/page-options.dto';
import { PageDto } from 'src/shared/pagination/page.dto';
import { AuthGuard } from '../auth/guards/auth.guards';
import { User } from 'src/shared/decorators/user.decorator';
import { UpdateOfertaDto } from './dto/updadte-oferta.dto';
import { Empleador } from 'src/repository/employer/employer.entity';
import { SearchOfertaDto } from './dto/search-oferta.dto';

@Controller('v1/ofertas')
export class OfertaController {
    constructor(private readonly ofertaService: OfertaService) { }

    @Post()
    async crearOferta(@Body() dto: CreateOfertaDto): Promise<Oferta> {
        return this.ofertaService.crearOferta(dto);
    }

    @Get()
    async listarOfertas(
        @Query() pageOptionsDto: PageOptionsDto,
        @Query() query: SearchOfertaDto
    ): Promise<PageDto<Oferta>> {
        return this.ofertaService.findAllOfertas(pageOptionsDto, query);
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

    @UseGuards(AuthGuard)
    @Delete(':id')
    async eliminarOferta(
        @Param('id') id: number,
        @User() user: any
    ): Promise<{ message: string }> {
        return this.ofertaService.eliminarOferta(id, user.sub);
    }

    @UseGuards(AuthGuard)
    @Patch(':id')
    async actualizarOferta(
        @Param('id') id: number,
        @User() user: any,
        @Body() updateOfertaDto: UpdateOfertaDto
    ): Promise<Oferta> {
        return this.ofertaService.actualizarOferta(+id, updateOfertaDto, user.sub);
    }


}
