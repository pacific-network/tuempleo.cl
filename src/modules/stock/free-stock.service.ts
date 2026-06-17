//modules/stock/free-stock.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StockGratis } from '../../repository/free_stock/free-stock.entity';

@Injectable()
export class FreeStockService {
    constructor(
        @InjectRepository(StockGratis)
        private readonly freeRepo: Repository<StockGratis>,
    ) { }

    /**
     * Obtiene o crea el stock gratuito mensual (3 por mes)
     */
    async getMonthlyFreeStock(empresaId: number) {
        const now = new Date();
        const mes = now.getMonth() + 1;
        const anio = now.getFullYear();

        let stock = await this.freeRepo.findOne({
            where: { empresa: { id: empresaId }, mes, anio },
        });

        if (!stock) {
            stock = this.freeRepo.create({
                empresa: { id: empresaId } as any,
                cantidad_disponible: 3,
                mes,
                anio,
            });

            await this.freeRepo.save(stock);
        }

        return stock;
    }

    /**
     * Resta 1 unidad del stock mensual gratuito
     */
    async useMonthlyFreeStock(empresaId: number) {
        const stock = await this.getMonthlyFreeStock(empresaId);

        if (stock.cantidad_disponible <= 0) {
            return {
                disponible: false,
                mensaje: 'No quedan avisos gratuitos este mes',
            };
        }

        stock.cantidad_disponible -= 1;
        await this.freeRepo.save(stock);

        return {
            disponible: true,
            stock,
        };
    }

    /**
     * ↩️ Devuelve 1 unidad al stock mensual gratuito (compensación).
     */
    async refundMonthlyFreeStock(empresaId: number) {
        const stock = await this.getMonthlyFreeStock(empresaId);
        stock.cantidad_disponible += 1;
        await this.freeRepo.save(stock);
        return stock;
    }
}
