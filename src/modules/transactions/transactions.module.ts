import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { TransactionsService } from "./transactions.service";
import { TransactionsController } from "./transactions.controller";
import { Transaction } from "../../repository/transaction/transaction.entity";
import { Usuario } from "src/repository/user/user.entity";
import { Empleador } from "src/repository/employer/employer.entity";
import { TransactionItem } from "src/repository/transaction_items/transaction-items.entity";



@Module({
    imports: [
        TypeOrmModule.forFeature([Transaction, Usuario, Empleador, TransactionItem]),
    ],
    controllers: [TransactionsController],
    providers: [TransactionsService],
    exports: [TransactionsService],
})
export class TransactionsModule { }
