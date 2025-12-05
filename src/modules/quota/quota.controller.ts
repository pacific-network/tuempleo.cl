import { Controller, Post, Body, Get, Query } from '@nestjs/common';
import { QuotaService } from './quota.service';
import { ConsumeQuotaDto } from './dto/consume-quota.dto';

@Controller('v1/quota')
export class QuotaController {
    constructor(private readonly quotaService: QuotaService) { }

    @Post('consume')
    async consumeQuota(@Body() dto: ConsumeQuotaDto) {
        return this.quotaService.consumeQuota(dto);
    }

    @Get('status')
    async checkUnlockStatus(
        @Query('empresa_id') empresa_id: string,
        @Query('oferta_id') oferta_id: string,
        @Query('usuario_id') usuario_id: string,
    ) {
        // Convertir a números
        const empresaIdNum = parseInt(empresa_id, 10);
        const ofertaIdNum = parseInt(oferta_id, 10);
        const usuarioIdNum = parseInt(usuario_id, 10);

        return this.quotaService.isUnlocked(empresaIdNum, ofertaIdNum, usuarioIdNum);
    }

    @Get('remaining')
    async getRemainingCupos(
      @Query('empresa_id') empresa_id: string,
      @Query('oferta_id') oferta_id: string
    ) {
      const empresaIdNum = parseInt(empresa_id, 10);
      const ofertaIdNum = parseInt(oferta_id, 10);
  
      return this.quotaService.getRemainingCupos(empresaIdNum, ofertaIdNum);
    }
}
