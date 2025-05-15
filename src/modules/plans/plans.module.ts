import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlansController } from './plans.controller';
import { PlansService } from './plans.service';
import { Planes } from '../../repository/plans/plans.entity';

@Module({
    imports: [TypeOrmModule.forFeature([Planes])],
    controllers: [PlansController],
    providers: [PlansService],
})
export class PlansModule { }