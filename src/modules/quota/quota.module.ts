import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CuposUsados } from '../../repository/used_quota/used_quota.entity';
import { QuotaService } from './quota.service';
import { QuotaController } from './quota.controller';
import { Empresa } from 'src/repository/business/business.entity';
import { Planes } from '../../repository/plans/plans.entity';
import { Oferta } from '../../repository/job_offer/job-offer.entity';
import { Usuario } from 'src/repository/user/user.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            CuposUsados,
            Empresa,
            Planes,
            Oferta,
            Usuario
        ])
    ],
    controllers: [QuotaController],
    providers: [QuotaService],
    exports: [QuotaService] // 👈 necesario para usarlo desde Oferta/Postulación
})
export class QuotaModule { }
