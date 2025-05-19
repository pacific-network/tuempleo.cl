import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { BusinessModule } from '../business/business.module';
import { EmpleadorController } from './employer.controller';
import { EmpleadorService } from './employer.service';
import { Empleador } from 'src/repository/employer/employer.entity';
import { Empresa } from 'src/repository/business/business.entity';
import { UserModule } from '../user/user.module';
import { Usuario } from 'src/repository/user/user.entity';


@Module({
  imports: [
    TypeOrmModule.forFeature([Empleador, Empresa, Usuario]),
    BusinessModule,
    UserModule,
  ],
  controllers: [EmpleadorController],
  providers: [EmpleadorService],
  exports: [EmpleadorService],

})

export class EmployerModule { }