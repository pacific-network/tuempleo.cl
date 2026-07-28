import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { LimpiezaService } from './limpieza.service';
import { Usuario } from 'src/repository/user/user.entity';
import { Registro } from 'src/repository/register/register.entity';
import { Oferta } from 'src/repository/job_offer/job-offer.entity';
import { Empleador } from 'src/repository/employer/employer.entity';
import { Empresa } from 'src/repository/business/business.entity';
import { Transaction } from 'src/repository/transaction/transaction.entity';
import { Postulante } from 'src/repository/postulant/postulant.entity';
import { EncryptModule } from 'src/shared/encrypt/encrypt.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Usuario,
      Registro,
      Oferta,
      Empleador,
      Empresa,
      Transaction,
      Postulante,
    ]),
    EncryptModule,
  ],
  providers: [AdminService, LimpiezaService],
  controllers: [AdminController],
})
export class AdminModule {}
