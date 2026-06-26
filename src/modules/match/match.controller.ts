import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard as JwtAuthGuard } from '@nestjs/passport';
import { AuthGuard } from '../auth/guards/auth.guards';
import { MatchService } from './match.service';

@Controller('v1/match')
export class MatchController {
  constructor(private readonly matchService: MatchService) {}

  // 👔 Empleador: postulantes de su oferta rankeados por afinidad
  @UseGuards(JwtAuthGuard('jwt'))
  @Get('oferta/:ofertaId/candidatos')
  async candidatosDeOferta(
    @Param('ofertaId', ParseIntPipe) ofertaId: number,
    @Query('min') min: string,
    @Req() req,
  ) {
    const userId = req.user.userId;
    const minScore = min !== undefined ? Number(min) : 0;
    return this.matchService.candidatosDeOferta(ofertaId, userId, minScore);
  }

  // 🙋 Candidato: qué tan bien calza su perfil con una oferta
  @UseGuards(AuthGuard)
  @Get('postulante/oferta/:ofertaId')
  async matchConOferta(
    @Param('ofertaId', ParseIntPipe) ofertaId: number,
    @Req() req,
  ) {
    return this.matchService.matchPostulanteOferta(ofertaId, req.user.sub);
  }

  // 🙋 Candidato: ofertas postuladas rankeadas por afinidad
  @UseGuards(AuthGuard)
  @Get('postulante/mis-ofertas')
  async misOfertas(@Req() req) {
    return this.matchService.misOfertasConMatch(req.user.sub);
  }
}
