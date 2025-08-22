import {
  Controller, Get, Post, Delete, Query, Param, Body,
  UseGuards, BadRequestException, UsePipes, ValidationPipe, HttpCode
} from '@nestjs/common';
import { GuardadosService } from './guardados.service';
import { AuthGuard } from '../auth/guards/auth.guards';
import { User } from 'src/shared/decorators/user.decorator';
import { CreateGuardadoDto } from './dto/create-guardado.dto';

@UseGuards(AuthGuard)
@Controller('v1/guardados')
export class GuardadosController {
  constructor(private readonly svc: GuardadosService) {}

  /** ¿Esta oferta está guardada por el candidato autenticado? */
  @Get('status')
  async status(@Query('oferta_id') ofertaIdStr: string, @User() user: any) {
    const ofertaId = Number(ofertaIdStr);
    if (!Number.isInteger(ofertaId)) throw new BadRequestException('oferta_id inválido');
    return this.svc.status(user.sub, ofertaId);
  }

  /** Guardar oferta (idempotente) */
  @Post()
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  @HttpCode(200) // cambia a 201 si quieres Created cuando realmente inserta
  async save(@Body() dto: CreateGuardadoDto, @User() user: any) {
    const ofertaId = Number(dto.oferta_id);
    if (!Number.isInteger(ofertaId)) throw new BadRequestException('oferta_id inválido');
    return this.svc.save(user.sub, ofertaId);
  }

  /** Quitar oferta de guardados */
  @Delete(':ofertaId')
  async remove(@Param('ofertaId') ofertaIdStr: string, @User() user: any) {
    const ofertaId = Number(ofertaIdStr);
    if (!Number.isInteger(ofertaId)) throw new BadRequestException('oferta_id inválido');
    return this.svc.remove(user.sub, ofertaId);
  }

  /** Listar guardados del candidato (paginado) */
  @Get()
  async list(
    @Query('limit') limit = '20',
    @Query('offset') offset = '0',
    @User() user: any,
  ) {
    const l = Number(limit);
    const o = Number(offset);
    if (!Number.isInteger(l) || l < 0) throw new BadRequestException('limit inválido');
    if (!Number.isInteger(o) || o < 0) throw new BadRequestException('offset inválido');
    return this.svc.list(user.sub, l, o);
  }

  /** Traer TODAS las ofertas guardadas del candidato (sin paginar) */
  @Get('all')
  async all(@User() user: any) {
    return this.svc.listAllOffers(user.sub);
  }
}
