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
        const fullStock = await this.stockService.getFullAvailability(empresaId);

        return {
            empresaId,
            gratis: fullStock.gratis,
            pagados: fullStock.pagados.map((s) => ({
                tipoAviso: s.tipoAviso,
                cantidad_disponible: s.cantidad_disponible,
            })),
            promociones: fullStock.promociones.map((p) => ({
                id: p.id,
                tipoAviso: p.tipoAviso,
                cantidad: p.cantidad,
                cantidad_usada: p.cantidad_usada,
                saldo: p.cantidad - p.cantidad_usada,
                fecha_inicio: p.fecha_inicio,
                fecha_fin: p.fecha_fin,
                origen: p.origen,
                motivo: p.motivo,
            })),
        };
    }

    // async getStockByEmpresa(@Param('empresaId') empresaId: number) {
    //     const stock = await this.stockService.getAvailability(empresaId);

    //     return {
    //         empresaId,
    //         stock: stock.map((s) => ({
    //             tipoAviso: s.tipoAviso,
    //             cantidad_disponible: s.cantidad_disponible,
    //         })),
    //     };
    // }
}
