import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmpresaController } from './business.controller';
import { EmpresaService } from './business.service';
import { Empresa } from '../../repository/business/business.entity';
import { VerificacionEmpresa } from '../../repository/business/verificacion-empresa.entity';
import { Empleador } from '../../repository/employer/employer.entity';
import { PromocionModule } from '../promocion/promocion.module';
import { SmsModule } from '../sms-generator/sms.module';
import { VerificacionEmpresaController } from './verificacion/verificacion-empresa.controller';
import { VerificacionEmpresaService } from './verificacion/verificacion-empresa.service';
import { EmployerAdminGuard } from '../auth/guards/employer-admin.guard';

@Module({
    imports: [
        TypeOrmModule.forFeature([Empresa, VerificacionEmpresa, Empleador]),
        PromocionModule,
        SmsModule,
    ],
    controllers: [EmpresaController, VerificacionEmpresaController],
    providers: [EmpresaService, VerificacionEmpresaService, EmployerAdminGuard],
    exports: [EmpresaService],
})

export class BusinessModule { }
