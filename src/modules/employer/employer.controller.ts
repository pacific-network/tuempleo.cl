import { Body, Controller, Post, Get, Param } from '@nestjs/common';
import { EmpleadorService } from './employer.service';
import { Empleador } from 'src/repository/employer/employer.entity';
import { CreateEmployerDto } from '../employer/dto/create-employer.dto';
import { EmpleadorBasicInfoDto } from './dto/basic-info.dto';

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
}
