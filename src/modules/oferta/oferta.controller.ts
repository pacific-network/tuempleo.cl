import { Controller, Post, Body, Get, Param, ParseIntPipe, Query, Delete, UseGuards, Patch, Req } from '@nestjs/common';
import { OfertaService } from './oferta.service';
import { CreateOfertaDto } from './dto/create-oferta.dto';
import { Oferta } from '../../repository/job_offer/job-offer.entity';
import { PageOptionsDto } from 'src/shared/pagination/page-options.dto';
import { PageDto } from 'src/shared/pagination/page.dto';
import { AuthGuard } from '../auth/guards/auth.guards';
import { User } from 'src/shared/decorators/user.decorator';
import { UpdateOfertaDto } from './dto/updadte-oferta.dto';
import { FilterOfertasDto } from './dto/filter-ofertas.dto';
import { CountVisitService } from './count-visit.service';

@Controller('v1/ofertas')
export class OfertaController {
  constructor(private readonly ofertaService: OfertaService,
    private readonly countVisitService: CountVisitService,
  ) { }


  @Post()
  async crearOferta(@Body() dto: CreateOfertaDto): Promise<Oferta> {
    return this.ofertaService.crearOferta(dto);
  }

  /** Listado público con filtros/búsqueda/paginación */
  @Get()
  async listarOfertas(
    @Query() pageOptionsDto: PageOptionsDto,
    @Query() query: FilterOfertasDto,
  ): Promise<PageDto<Oferta>> {
    return this.ofertaService.findAllOfertas(pageOptionsDto, query);
  }

  /** Listado por empleador (dashboard empresa) */
  @Get('empleador/:empleadorId')
  async obtenerOfertasPorEmpleador(
    @Param('empleadorId', ParseIntPipe) empleadorId: number,
    @Query() pageOptionsDto: PageOptionsDto
  ): Promise<PageDto<Oferta>> {
    return this.ofertaService.obtenerOfertasPorEmpleador(empleadorId, pageOptionsDto);
  }

  /** Detalle de oferta */
  @Get(':id')
  async obtenerOfertaPorId(@Param('id', ParseIntPipe) id: number) {
    return this.ofertaService.obtenerOfertaPorId(id);
  }

  /** Soft delete */
  @UseGuards(AuthGuard)
  @Delete(':id')
  async eliminarOferta(
    @Param('id', ParseIntPipe) id: number,
    @User() user: any
  ): Promise<{ message: string }> {
    return this.ofertaService.eliminarOferta(id, user.sub);
  }

  /** Update parcial */
  @UseGuards(AuthGuard)
  @Patch(':id')
  async actualizarOferta(
    @Param('id', ParseIntPipe) id: number,
    @User() user: any,
    @Body() updateOfertaDto: UpdateOfertaDto
  ): Promise<Oferta> {
    return this.ofertaService.actualizarOferta(+id, updateOfertaDto, user.sub);
  }

  @UseGuards(AuthGuard)
  @Post(':id/visit')
  async registrarVisita(@Param('id', ParseIntPipe) id: number, @Req() req: Request) {
    const user = (req as any).user;
    const userId = user?.id ?? user?.sub ?? null;
    return this.countVisitService.registerVisit(id, userId);
  }

  @UseGuards(AuthGuard)
  @Get("empresa/:empresaId")
  async obtenerPorEmpresa(@Param("empresaId", ParseIntPipe) empresaId: number) {
    return this.ofertaService.obtenerOfertasPorEmpresa(empresaId);
  }
}
