import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MercadoPagoService } from './mercado-pago.service';
import { MercadoPagoController } from './mercado-pago.controller';
import { Transaction } from 'src/repository/transaction/transaction.entity';
import { TransactionItem } from 'src/repository/transaction_items/transaction-items.entity';
import { Usuario } from 'src/repository/user/user.entity';
import { Empleador } from 'src/repository/employer/employer.entity';
import { StockModule } from '../stock/stock.module';

@Module({
    imports: [
        ConfigModule,
        TypeOrmModule.forFeature([
            Transaction,
            TransactionItem,
            Usuario,
            Empleador,
        ]),
        StockModule, // para poder usar StockService si lo necesitas después
    ],
    controllers: [MercadoPagoController],
    providers: [MercadoPagoService],
    exports: [MercadoPagoService], // opcional: si lo usarás desde otros módulos
})
export class MercadoPagoModule { }
