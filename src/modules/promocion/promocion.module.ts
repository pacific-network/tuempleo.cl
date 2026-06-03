import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Promocion } from 'src/repository/promocion/promocion.entity';
import { PromocionService } from './promocion.service';
import { SystemConfigModule } from '../system-config/system-config.module';

@Module({
    imports: [TypeOrmModule.forFeature([Promocion]), SystemConfigModule],
    providers: [PromocionService],
    exports: [PromocionService],
})
export class PromocionModule { }
