import {
  Controller, Get, Delete, Patch,
  Param, Query, ParseIntPipe, UseGuards,
} from '@nestjs/common';
import { AdminGuard } from '../auth/guards/admin.guard';
import { AdminService } from './admin.service';
import { User } from 'src/shared/decorators/user.decorator';

@UseGuards(AdminGuard)
@Controller('v1/admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // ─────────────────────────────────────────
  // PING / TEST
  // ─────────────────────────────────────────

  @Get('ping')
  ping(@User() user: any) {
    return { ok: true, message: 'Admin access confirmed', adminId: user.sub };
  }

  // ─────────────────────────────────────────
  // STATS
  // ─────────────────────────────────────────

  @Get('stats')
  getStats() {
    return this.adminService.getStats();
  }

  // ─────────────────────────────────────────
  // USUARIOS
  // ─────────────────────────────────────────

  @Get('usuarios')
  getUsuarios(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    return this.adminService.getUsuarios(Number(page), Number(limit));
  }

  @Get('usuarios/:id')
  getUsuario(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.getUsuario(id);
  }

  @Patch('usuarios/:id/toggle')
  toggleActivo(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.toggleActivo(id);
  }

  @Patch('usuarios/:id/admin')
  toggleAdmin(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.toggleAdmin(id);
  }

  // ─────────────────────────────────────────
  // REGISTROS
  // ─────────────────────────────────────────

  @Get('registros')
  getRegistros(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    return this.adminService.getRegistros(Number(page), Number(limit));
  }

  @Patch('registros/:id/activar')
  activarRegistro(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.activarRegistro(id);
  }

  // ─────────────────────────────────────────
  // OFERTAS
  // ─────────────────────────────────────────

  @Get('ofertas')
  getOfertas(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    return this.adminService.getOfertas(Number(page), Number(limit));
  }

  @Delete('ofertas/:id')
  eliminarOferta(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.eliminarOferta(id);
  }

  // ─────────────────────────────────────────
  // EMPLEADORES
  // ─────────────────────────────────────────

  @Get('empleadores')
  getEmpleadores(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    return this.adminService.getEmpleadores(Number(page), Number(limit));
  }

  // ─────────────────────────────────────────
  // EMPRESAS
  // ─────────────────────────────────────────

  @Get('empresas')
  getEmpresas(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    return this.adminService.getEmpresas(Number(page), Number(limit));
  }

  // ─────────────────────────────────────────
  // TRANSACCIONES
  // ─────────────────────────────────────────

  @Get('transacciones')
  getTransacciones(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    return this.adminService.getTransacciones(Number(page), Number(limit));
  }
}
