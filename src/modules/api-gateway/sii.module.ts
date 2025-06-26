import { Module } from '@nestjs/common';
import { SiiService } from './sii.service';
import { SiiController } from './sii.controller';
import { HttpModule } from '@nestjs/axios';

@Module({
    imports: [HttpModule],
    controllers: [SiiController],
    providers: [SiiService],
})
export class SiiModule { }
