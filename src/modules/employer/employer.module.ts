import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { BusinessModule } from '../business/business.module';
import { EmpleadorController } from './employer.controller';
import { EmpleadorService } from './employer.service';
import { InvitacionService } from './invitacion.service';
import { Empleador } from 'src/repository/employer/employer.entity';
import { Empresa } from 'src/repository/business/business.entity';
import { UserModule } from '../user/user.module';
import { Usuario } from 'src/repository/user/user.entity';
import { Oferta } from 'src/repository/job_offer/job-offer.entity';
import { Postulacion } from 'src/repository/applications/applications.entity';
import { InvitacionEmpleador } from 'src/repository/invitacion-empleador/invitacion-empleador.entity';
import { Registro } from 'src/repository/register/register.entity';
import { StockModule } from '../stock/stock.module';
import { SmsModule } from '../sms-generator/sms.module';
import { MailerModule } from '../mailer/mailer.module';
import { EncryptModule } from 'src/shared/encrypt/encrypt.module';
import { EmployerAdminGuard } from '../auth/guards/employer-admin.guard';


@Module({
  imports: [
    TypeOrmModule.forFeature([Empleador, Empresa, Usuario, Oferta, Postulacion, InvitacionEmpleador, Registro]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET') || 'pacificNetwork2024',
        signOptions: { expiresIn: '7d' },
      }),
      inject: [ConfigService],
    }),
    BusinessModule,
    UserModule,
    StockModule,
    SmsModule,
    MailerModule,
    EncryptModule,
  ],
  controllers: [EmpleadorController],
  providers: [EmpleadorService, InvitacionService, EmployerAdminGuard],
  exports: [EmpleadorService],

})

export class EmployerModule { }
