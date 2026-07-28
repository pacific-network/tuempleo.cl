import {
  Controller, Get, Post, Delete, Patch,
  Body, Param, Query, ParseIntPipe, UseGuards,
  UseInterceptors, ClassSerializerInterceptor,
  UsePipes, ValidationPipe,
} from '@nestjs/common';
import { AdminGuard } from '../auth/guards/admin.guard';
import { StaffGuard } from '../auth/guards/staff.guard';
import { AdminService } from './admin.service';
import { LimpiezaService } from './limpieza.service';
import { CreateSupervisorDto } from './dto/create-supervisor.dto';
import { User } from 'src/shared/decorators/user.decorator';

// Gestión general: accesible a admin y supervisor (StaffGuard).
// Los endpoints de dinero/sensibles se refuerzan con @UseGuards(AdminGuard)
// a nivel de método → quedan solo para admin.
@UseGuards(StaffGuard)
@UseInterceptors(ClassSerializerInterceptor)
@Controller('v1/admin')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly limpiezaService: LimpiezaService,
  ) {}

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

  // 🔒 Escalada de privilegios: solo admin.
  @UseGuards(AdminGuard)
  @Patch('usuarios/:id/admin')
  toggleAdmin(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.toggleAdmin(id);
  }

  // 🔒 Asignar/quitar rol supervisor: solo admin.
  @UseGuards(AdminGuard)
  @Patch('usuarios/:id/supervisor')
  toggleSupervisor(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.toggleSupervisor(id);
  }

  // ─────────────────────────────────────────
  // SUPERVISORES (admin → crea supervisores)
  // ─────────────────────────────────────────

  // 🔒 Crear cuenta de supervisor desde cero: solo admin.
  @UseGuards(AdminGuard)
  @Post('supervisores')
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  crearSupervisor(@Body() dto: CreateSupervisorDto) {
    return this.adminService.crearSupervisor(dto);
  }

  // 🔒 Listar supervisores: solo admin.
  @UseGuards(AdminGuard)
  @Get('supervisores')
  getSupervisores(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    return this.adminService.getSupervisores(Number(page), Number(limit));
  }

  // ─────────────────────────────────────────
  // POSTULANTES
  // ─────────────────────────────────────────

  @Get('postulantes')
  getPostulantes(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    return this.adminService.getPostulantes(Number(page), Number(limit));
  }

  // ─────────────────────────────────────────
  // ADMINS
  // ─────────────────────────────────────────

  @Get('admins')
  getAdmins(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    return this.adminService.getAdmins(Number(page), Number(limit));
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

  @Get('ofertas/pendientes')
  getOfertasPendientes(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    return this.adminService.getOfertasPendientes(Number(page), Number(limit));
  }

  @Patch('ofertas/:id/aprobar')
  aprobarOferta(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.aprobarOferta(id);
  }

  @Patch('ofertas/:id/rechazar')
  rechazarOferta(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.rechazarOferta(id);
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

  // 🔒 Datos de dinero: solo admin (supervisor recibe 403).
  @UseGuards(AdminGuard)
  @Get('transacciones')
  getTransacciones(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    return this.adminService.getTransacciones(Number(page), Number(limit));
  }

  // 🔒 Datos de dinero: solo admin (supervisor recibe 403).
  @UseGuards(AdminGuard)
  @Get('transacciones/:id')
  getTransaccion(@Param('id') id: string) {
    return this.adminService.getTransaccion(id);
  }

  // ─────────────────────────────────────────
  // LIMPIEZA DE EMPRESAS HUÉRFANAS
  // ─────────────────────────────────────────

  // Listado + motivo del bloqueo. Read-only, accesible a staff.
  @Get('limpieza/empresas-huerfanas')
  getEmpresasHuerfanas(@Query('minutos') minutos = '60') {
    return this.limpiezaService.listarEmpresasHuerfanas(Number(minutos));
  }

  // Diagnóstico detallado de una empresa. Read-only, accesible a staff.
  @Get('limpieza/empresas/:id')
  getDiagnosticoEmpresa(@Param('id', ParseIntPipe) id: number) {
    return this.limpiezaService.diagnosticarEmpresa(id);
  }

  // 🔒 Borrado: solo admin. dryRun=true por defecto — hay que pedir
  // explícitamente ?dryRun=false para que escriba.
  @UseGuards(AdminGuard)
  @Delete('limpieza/empresas/:id')
  eliminarEmpresaHuerfana(
    @Param('id', ParseIntPipe) id: number,
    @Query('dryRun') dryRun = 'true',
  ) {
    return this.limpiezaService.eliminarEmpresa(id, dryRun !== 'false');
  }
}
