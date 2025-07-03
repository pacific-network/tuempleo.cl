import { Body, Controller, Post, Get, Param, NotFoundException } from '@nestjs/common';
import { EmpleadorService } from './employer.service';
import { Empleador } from 'src/repository/employer/employer.entity';
import { CreateEmployerDto } from '../employer/dto/create-employer.dto';
import { EmpleadorBasicInfoDto } from './dto/basic-info.dto';
import { AuthGuard } from '@nestjs/passport';
import { Empresa } from 'src/repository/business/business.entity';

@Controller('v1/empleador')
export class EmpleadorController {
  constructor(private readonly empleadorService: EmpleadorService) { }

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



}
