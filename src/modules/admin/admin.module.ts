import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { Usuario } from 'src/repository/user/user.entity';
import { Registro } from 'src/repository/register/register.entity';
import { Oferta } from 'src/repository/job_offer/job-offer.entity';
import { Empleador } from 'src/repository/employer/employer.entity';
import { Empresa } from 'src/repository/business/business.entity';
import { Transaction } from 'src/repository/transaction/transaction.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Usuario,
      Registro,
      Oferta,
      Empleador,
      Empresa,
      Transaction,
    ]),
  ],
  providers: [AdminService],
  controllers: [AdminController],
})
export class AdminModule {}
