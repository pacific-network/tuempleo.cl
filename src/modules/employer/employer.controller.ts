import { Body, Controller, Post, Get, Param, NotFoundException, Patch, UseGuards, Req, Query } from '@nestjs/common';
import { EmpleadorService } from './employer.service';
import { InvitacionService } from './invitacion.service';
import { Empleador } from 'src/repository/employer/employer.entity';
import { CreateEmployerDto } from '../employer/dto/create-employer.dto';
import { EmpleadorBasicInfoDto } from './dto/basic-info.dto';
import { AuthGuard } from '@nestjs/passport';
import { Empresa } from 'src/repository/business/business.entity';
import { UpdateBusinessDto } from '../business/dto/update-business.dto';
import { UpdateEmployerDto } from './dto/update-employer.dto';
import { InvitarEmpleadorDto, ValidarCodigoDto, AceptarInvitacionDto } from './dto/invitar-empleador.dto';
import { PageOptionsDto } from 'src/shared/pagination/page-options.dto';
import { PageDto } from 'src/shared/pagination/page.dto';


@Controller('v1/empleador')
export class EmpleadorController {
  constructor(
    private readonly empleadorService: EmpleadorService,
    private readonly invitacionService: InvitacionService,
  ) { }

  @Post()
  async createEmployer(@Body() createEmployerDto: CreateEmployerDto): Promise<Empleador> {
    return this.empleadorService.createEmployerWithCompany(
      createEmployerDto,
      createEmployerDto.empresaId
    );
  }

  @Get(':userId')
  async getEmployerByUserId(@Param('userId') userId: number): Promise<Empleador | null> {
    return this.empleadorService.findEmployerByUserId(userId);
  }

  @Get('basic-info/:userId')
  async getBasicInfo(@Param('userId') userId: number): Promise<EmpleadorBasicInfoDto> {
    return this.empleadorService.findBasicInfo(userId);
  }

  @Get('empresa/:userId')
  async getEmpresaByUserId(@Param('userId') userId: number): Promise<Empresa> {
    const empresa = await this.empleadorService.BusinessEmployer(userId);

    if (!empresa) {
      throw new NotFoundException(`Empresa para usuario ID ${userId} no encontrada`);
    }

    return empresa;
  }


  @Patch('empresa')
  @UseGuards(AuthGuard('jwt'))
  async updateEmpresa(
    @Body() dto: UpdateBusinessDto,
    @Req() req: any,
  ): Promise<Empresa> {
    const userId = req.user.userId; // <- Asegúrate de que `req.user` viene del token JWT
    return this.empleadorService.updateEmployerBusiness(userId, dto);
  }

  @Patch('/data')
  @UseGuards(AuthGuard('jwt'))
  async updateEmployer(
    @Body() dto: UpdateEmployerDto,
    @Req() req: any,
  ): Promise<Empleador> {
    const userId = req.user.userId;
    return this.empleadorService.updateEmployerData(userId, dto);
  }

  @Get('estadisticas/:userId')
  @UseGuards(AuthGuard('jwt'))
  async getEstadisticas(@Param('userId') userId: number) {
    return this.empleadorService.getEstadisticas(userId);
  }

  @Get()
  @UseGuards(AuthGuard('jwt'))
  async getAllEmployers(
    @Param('empleadorId') empleadorId: number,
    @Query() pageOptionsDto: PageOptionsDto
  ): Promise<PageDto<Empleador>> {
    return this.empleadorService.findAllEmployers(empleadorId, pageOptionsDto);
  }

  // ======================================================
  // INVITACIONES
  // ======================================================

  /** Admin invita miembro por SMS */
  @Post('invitar')
  @UseGuards(AuthGuard('jwt'))
  async invitarMiembro(
    @Req() req: any,
    @Body() dto: InvitarEmpleadorDto,
  ) {
    const userId = req.user.userId;
    return this.invitacionService.invitar(userId, dto.telefono, dto.email);
  }

  /** Validar codigo de invitacion (sin consumirlo) */
  @Post('invitacion/validar')
  async validarCodigo(@Body() dto: ValidarCodigoDto) {
    return this.invitacionService.validarCodigo(dto.codigo);
  }

  /** Aceptar invitacion y crear cuenta */
  @Post('invitacion/aceptar')
  async aceptarInvitacion(@Body() dto: AceptarInvitacionDto) {
    return this.invitacionService.aceptarInvitacion(dto);
  }

}
