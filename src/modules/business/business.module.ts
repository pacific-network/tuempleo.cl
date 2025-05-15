import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BusinessController } from './business.controller';
import { BusinessService } from './business.service';
import { Empresa } from '../../repository/business/business.entity';

@Module({
    imports: [TypeOrmModule.forFeature([Empresa])],
    controllers: [BusinessController],
    providers: [BusinessService],
})

export class BusinessModule { }