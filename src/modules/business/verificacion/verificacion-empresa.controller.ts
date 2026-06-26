import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Req,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthGuard } from '@nestjs/passport';
import { EmployerAdminGuard } from '../../auth/guards/employer-admin.guard';
import { VerificacionEmpresaService } from './verificacion-empresa.service';
import { SolicitarVerificacionDto, ConfirmarVerificacionDto } from './dto/verificacion.dto';

@Controller('v1/empresas')
export class VerificacionEmpresaController {
  constructor(private readonly verificacionService: VerificacionEmpresaService) {}

  // Admin de la empresa solicita el código de verificación por SMS.
  @UseGuards(AuthGuard('jwt'), EmployerAdminGuard)
  @Throttle({ default: { ttl: 60_000, limit: 3 } })
  @Post(':id/verificacion/solicitar')
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  solicitar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SolicitarVerificacionDto,
    @Req() req,
  ) {
    const userId = req.user?.sub ?? req.user?.userId;
    return this.verificacionService.solicitar(id, dto.telefono, userId);
  }

  // Admin confirma el código → la empresa queda verificada.
  @UseGuards(AuthGuard('jwt'), EmployerAdminGuard)
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @Post(':id/verificacion/confirmar')
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  confirmar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ConfirmarVerificacionDto,
    @Req() req,
  ) {
    const userId = req.user?.sub ?? req.user?.userId;
    return this.verificacionService.confirmar(id, dto.codigo, userId);
  }

  // Estado público de verificación (para mostrar la insignia).
  @Get(':id/verificacion/estado')
  estado(@Param('id', ParseIntPipe) id: number) {
    return this.verificacionService.estado(id);
  }
}
