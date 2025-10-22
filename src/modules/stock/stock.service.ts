// src/modules/stock/stock.service.ts
import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Stock } from '../../repository/stock/stock.entity';
import { Transaction } from '../../repository/transaction/transaction.entity';
import { TransactionItem } from '../../repository/transaction_items/transaction-items.entity';

@Injectable()
export class StockService {
    constructor(
        @InjectRepository(Stock)
        private readonly stockRepo: Repository<Stock>,

        @InjectRepository(Transaction)
        private readonly transactionRepo: Repository<Transaction>,

        @InjectRepository(TransactionItem)
        private readonly itemRepo: Repository<TransactionItem>,
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

        // 2️⃣ Iterar sobre los ítems y actualizar stock
        for (const item of transaction.items) {
            await this.addCreditsByTransaction(empresaId, item.tipoAviso, item.cantidad);
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
     * ➖ Usa un crédito de un tipo específico
     */
    async useCredit(empresaId: number, tipoAviso: 'BASICO' | 'ESTANDAR' | 'PREMIUM') {
        const stock = await this.stockRepo.findOne({
            where: { empresa: { id: empresaId }, tipoAviso },
            lock: { mode: 'pessimistic_write' },
        });

        if (!stock || stock.cantidad_disponible <= 0) {
            throw new BadRequestException(`No hay créditos disponibles del tipo ${tipoAviso}`);
        }

        stock.cantidad_disponible -= 1;
        await this.stockRepo.save(stock);
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


}


