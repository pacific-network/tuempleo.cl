import { Module } from '@nestjs/common';
import { GetRutController } from './get-rut.controller';
import { GetRutService } from './get-rut.service';

@Module({
    controllers: [GetRutController],
    providers: [GetRutService],
})
export class SimpleApiModule { }
