import { Body, Controller, Post } from '@nestjs/common';
import { EmpleadorService } from './employer.service';
import { Empleador } from 'src/repository/employer/employer.entity';
import { CreateEmployerDto } from '../employer/dto/create-employer.dto';

@Controller('v1/empleador')
export class EmpleadorController {
  constructor(private readonly empleadorService: EmpleadorService) {}

  @Post()
  async createEmployer(@Body() createEmployerDto: CreateEmployerDto): Promise<Empleador> {
    return this.empleadorService.createEmployerWithCompany(
      createEmployerDto,
      createEmployerDto.empresaId
    );
  }
}
