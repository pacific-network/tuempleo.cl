import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { StockService } from './stock.service';

@Controller('v1/stock')
export class StockController {
    constructor(private readonly stockService: StockService) { }

    // 🔍 Obtener créditos disponibles por empresa
    @Get('empresa/:empresaId')
    @UseGuards(AuthGuard('jwt'))
    async getStockByEmpresa(@Param('empresaId') empresaId: number) {
        const stock = await this.stockService.getAvailability(empresaId);

        return {
            empresaId,
            stock: stock.map((s) => ({
                tipoAviso: s.tipoAviso,
                cantidad_disponible: s.cantidad_disponible,
            })),
        };
    }
}
