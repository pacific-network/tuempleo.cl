import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Cupon } from 'src/repository/cupon/cupon.entity';
import { CuponCanje } from 'src/repository/cupon/cupon-canje.entity';
import { Promocion } from 'src/repository/promocion/promocion.entity';
import { Empleador } from 'src/repository/employer/employer.entity';
import { CuponService } from './cupon.service';
import { CuponController } from './cupon.controller';

@Module({
    imports: [TypeOrmModule.forFeature([Cupon, CuponCanje, Promocion, Empleador])],
    providers: [CuponService],
    controllers: [CuponController],
    exports: [CuponService],
})
export class CuponModule { }
