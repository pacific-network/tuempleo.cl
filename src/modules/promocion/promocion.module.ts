import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Promocion } from 'src/repository/promocion/promocion.entity';
import { PromocionService } from './promocion.service';

@Module({
    imports: [TypeOrmModule.forFeature([Promocion])],
    providers: [PromocionService],
    exports: [PromocionService],
})
export class PromocionModule { }
