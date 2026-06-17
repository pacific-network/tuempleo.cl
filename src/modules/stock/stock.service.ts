// src/modules/stock/stock.service.ts
import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Stock } from '../../repository/stock/stock.entity';
import { Transaction } from '../../repository/transaction/transaction.entity';
import { TransactionItem } from '../../repository/transaction_items/transaction-items.entity';
import { StockGratis } from 'src/repository/free_stock/free-stock.entity';
import { FreeStockService } from 'src/modules/stock/free-stock.service';
import { PromocionService } from 'src/modules/promocion/promocion.service';
import { Promocion } from 'src/repository/promocion/promocion.entity';
@Injectable()
export class StockService {
    constructor(
        @InjectRepository(Stock)
        private readonly stockRepo: Repository<Stock>,

        @InjectRepository(Transaction)
        private readonly transactionRepo: Repository<Transaction>,

        @InjectRepository(TransactionItem)
        private readonly itemRepo: Repository<TransactionItem>,

        public readonly freeStockService: FreeStockService,

        private readonly promocionService: PromocionService,
    ) { }

    /**
     * 📦 Genera o actualiza stock basado en una transacción autorizada
     */
    async processTransactionStock(transactionId: string, empresaId: number) {
        // 1️⃣ Buscar la transacción y sus ítems
        const transaction = await this.transactionRepo.findOne({
            where: { id: transactionId },
            relations: ['items'],
        });

        if (!transaction) {
            throw new NotFoundException(`Transacción ${transactionId} no encontrada`);
        }

        if (!transaction.items || transaction.items.length === 0) {
            throw new BadRequestException(`Transacción ${transactionId} sin ítems`);
        }

        console.log(`🧾 Procesando stock desde transacción ${transactionId}`);

        for (const item of transaction.items) {

            // Normalizamos a MAYÚSCULAS: si el ítem se guardó con otro casing
            // (p.ej. 'basico' desde Webpay), igual lo cuadramos con el enum del stock.
            const tipoAviso = (item.tipoAviso ?? '').toUpperCase() as
                | 'GRATIS' | 'BASICO' | 'ESTANDAR' | 'PREMIUM';

            // 🎁 Avisos GRATIS NO generan stock pagado
            if (tipoAviso === 'GRATIS') {
                console.log('🎁 Aviso GRATIS no genera stock pagado');
                continue;
            }

            await this.addCreditsByTransaction(
                empresaId,
                tipoAviso, // ahora TS sabe que NO es GRATIS
                item.cantidad
            );
        }


        console.log(`✅ Stock generado/actualizado para empresa ${empresaId}`);
    }

    /**
     * ➕ Crea o incrementa créditos según el tipo de aviso
     */
    private async addCreditsByTransaction(
        empresaId: number,
        tipoAviso: 'BASICO' | 'ESTANDAR' | 'PREMIUM',
        cantidad: number,
    ) {
        tipoAviso = tipoAviso.toUpperCase() as any;

        let stock = await this.stockRepo.findOne({
            where: { empresa: { id: empresaId }, tipoAviso },
            relations: ['empresa'],
        });

        if (!stock) {
            stock = this.stockRepo.create({
                tipoAviso,
                cantidad_disponible: cantidad,
                empresa: { id: empresaId } as any,
            });
            console.log(`🆕 Creando nuevo stock (${tipoAviso}) con ${cantidad} créditos`);
        } else {
            stock.cantidad_disponible += cantidad;
            console.log(`♻️ Sumando ${cantidad} créditos a ${tipoAviso} (nuevo total: ${stock.cantidad_disponible})`);
        }

        await this.stockRepo.save(stock);
    }

    /**
     * ➖ Usa un crédito de un tipo específico.
     * @returns objeto con la promoción consumida (si la hubo) y el origen del crédito.
     */
    async useCredit(
        empresaId: number,
        tipoAviso: 'GRATIS' | 'BASICO' | 'ESTANDAR' | 'PREMIUM',
    ): Promise<{ promocion: Promocion | null; origen: 'GRATIS' | 'PROMOCION' | 'PAGADO' }> {
        tipoAviso = tipoAviso.toUpperCase() as any;

        // 📌 1) Si el aviso es GRATIS → usar lógica de stock gratuito
        if (tipoAviso === 'GRATIS') {
            console.log('🎁 Usando crédito gratuito mensual');
            const result = await this.freeStockService.useMonthlyFreeStock(empresaId);

            if (!result.disponible) {
                throw new Error(result.mensaje);
            }

            return { promocion: null, origen: 'GRATIS' };
        }

        // 📌 2) Promoción vigente → consume primero el regalo antes que el stock pagado
        const promoUsada = await this.promocionService.consumirSiVigente(empresaId, tipoAviso);
        if (promoUsada) {
            console.log(`🎁 Crédito ${tipoAviso} consumido desde promoción vigente (id=${promoUsada.id})`);
            return { promocion: promoUsada, origen: 'PROMOCION' };
        }

        // 📌 3) Avisos pagados → lógica actual (NO se toca)
        const stock = await this.stockRepo.findOne({
            where: { empresa: { id: empresaId }, tipoAviso },
        });

        if (!stock) {
            throw new NotFoundException(
                `No se encontró stock del tipo ${tipoAviso} para la empresa ${empresaId}`,
            );
        }

        if (stock.cantidad_disponible <= 0) {
            throw new BadRequestException(
                `No hay créditos disponibles del tipo ${tipoAviso}`,
            );
        }

        stock.cantidad_disponible -= 1;
        await this.stockRepo.save(stock);

        return { promocion: null, origen: 'PAGADO' };
    }



    /**
     * ↩️ Revierte un crédito previamente consumido por useCredit.
     * Compensación para cuando la operación posterior (crear la oferta) falla,
     * de modo que el empleador no pierda el crédito. El inverso depende del
     * origen que devolvió useCredit.
     */
    async refundCredit(
        empresaId: number,
        tipoAviso: 'GRATIS' | 'BASICO' | 'ESTANDAR' | 'PREMIUM',
        origen: 'GRATIS' | 'PROMOCION' | 'PAGADO',
        promocion: Promocion | null,
    ): Promise<void> {
        tipoAviso = tipoAviso.toUpperCase() as any;

        if (origen === 'GRATIS') {
            await this.freeStockService.refundMonthlyFreeStock(empresaId);
            console.log(`↩️ Crédito GRATIS devuelto a empresa ${empresaId}`);
            return;
        }

        if (origen === 'PROMOCION') {
            if (promocion) {
                await this.promocionService.revertirConsumo(promocion.id);
                console.log(`↩️ Crédito de promoción ${promocion.id} devuelto a empresa ${empresaId}`);
            }
            return;
        }

        // PAGADO → reponer 1 unidad al stock del tipo
        const stock = await this.stockRepo.findOne({
            where: { empresa: { id: empresaId }, tipoAviso: tipoAviso as 'BASICO' | 'ESTANDAR' | 'PREMIUM' },
        });
        if (stock) {
            stock.cantidad_disponible += 1;
            await this.stockRepo.save(stock);
            console.log(`↩️ Crédito ${tipoAviso} devuelto a empresa ${empresaId}`);
        }
    }

    /**
     * 🔍 Consulta del stock actual
     */
    async getAvailability(empresaId: number) {
        return this.stockRepo.find({
            where: { empresa: { id: empresaId } },
            order: { tipoAviso: 'ASC' },
        });
    }

    /**
   * Combina pagados + gratuitos
   */
    async getFullAvailability(empresaId: number) {
        const pagados = await this.getAvailability(empresaId);
        const gratis = await this.freeStockService.getMonthlyFreeStock(empresaId);
        const promociones = await this.promocionService.getVigentes(empresaId);

        return { gratis, pagados, promociones };
    }
}


