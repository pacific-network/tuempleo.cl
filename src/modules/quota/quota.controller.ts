import { Controller, Post, Body } from '@nestjs/common';
import { QuotaService } from './quota.service';
import { ConsumeQuotaDto } from './dto/consume-quota.dto';

@Controller('v1/quota')
export class QuotaController {
    constructor(private readonly quotaService: QuotaService) { }

    @Post('consume')
    async consumeQuota(@Body() dto: ConsumeQuotaDto) {
        return this.quotaService.consumeQuota(dto);
    }
}
