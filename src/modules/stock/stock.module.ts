// src/modules/stock/stock.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Stock } from 'src/repository/stock/stock.entity';
import { StockService } from './stock.service';
import { Transaction } from 'src/repository/transaction/transaction.entity';
import { TransactionItem } from 'src/repository/transaction_items/transaction-items.entity';
import { StockController } from './stock.controller';
import { StockGratis } from 'src/repository/free_stock/free-stock.entity';
import { FreeStockService } from 'src/modules/stock/free-stock.service';
import { PromocionModule } from 'src/modules/promocion/promocion.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([Stock, Transaction, TransactionItem, StockGratis]),
        PromocionModule,
    ],
    providers: [
        StockService,
        FreeStockService,
    ],
    controllers: [StockController],
    exports: [
        StockService,
        FreeStockService,   // 👈 AGREGA ESTO
    ],
})
export class StockModule { }
