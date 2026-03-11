import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { BusinessModule } from '../business/business.module';
import { EmpleadorController } from './employer.controller';
import { EmpleadorService } from './employer.service';
import { Empleador } from 'src/repository/employer/employer.entity';
import { Empresa } from 'src/repository/business/business.entity';
import { UserModule } from '../user/user.module';
import { Usuario } from 'src/repository/user/user.entity';
import { Oferta } from 'src/repository/job_offer/job-offer.entity';
import { Postulacion } from 'src/repository/applications/applications.entity';
import { StockModule } from '../stock/stock.module';


@Module({
  imports: [
    TypeOrmModule.forFeature([Empleador, Empresa, Usuario, Oferta, Postulacion]),
    BusinessModule,
    UserModule,
    StockModule,
  ],
  controllers: [EmpleadorController],
  providers: [EmpleadorService],
  exports: [EmpleadorService],

})

export class EmployerModule { }