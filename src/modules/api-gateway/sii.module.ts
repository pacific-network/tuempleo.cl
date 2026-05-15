import { Module } from '@nestjs/common';
import { SiiService } from './sii.service';
import { SiiScraperService } from './sii-scraper.service';
import { SiiController } from './sii.controller';
import { HttpModule } from '@nestjs/axios';

@Module({
    imports: [HttpModule],
    controllers: [SiiController],
    providers: [SiiService, SiiScraperService],
})
export class SiiModule { }
