// src/modules/stock/stock.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Stock } from 'src/repository/stock/stock.entity';
import { StockService } from './stock.service';
import { WebpayService } from '../webpay+/webpay.service';
import { Transaction } from 'src/repository/transaction/transaction.entity';
import { TransactionItem } from 'src/repository/transaction_items/transaction-items.entity';

@Module({
    imports: [TypeOrmModule.forFeature([Stock, Transaction, TransactionItem])],
    providers: [StockService],
    exports: [StockService], // 👈 importante para que otros módulos lo usen
})
export class StockModule { }
