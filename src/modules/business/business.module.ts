import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmpresaController } from './business.controller';
import { EmpresaService } from './business.service';
import { Empresa } from '../../repository/business/business.entity';
import { PromocionModule } from '../promocion/promocion.module';

@Module({
    imports: [TypeOrmModule.forFeature([Empresa]), PromocionModule],
    controllers: [EmpresaController],
    providers: [EmpresaService],
    exports: [EmpresaService],
})

export class BusinessModule { }