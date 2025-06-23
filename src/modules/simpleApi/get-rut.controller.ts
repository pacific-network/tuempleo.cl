import { Controller, Get, Param } from '@nestjs/common';
import { GetRutService } from './get-rut.service';

@Controller('v1/rut')
export class GetRutController {
    constructor(private readonly getRutService: GetRutService) { }

    @Get(':rut')
    async getRutInfo(@Param('rut') rut: string) {
        return this.getRutService.fetchRutData(rut);
    }
}
