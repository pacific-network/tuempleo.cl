// src/modules/webpay/webpay.module.ts
import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { WebpayService } from "./webpay.service";
import { WebpayController } from "./webpay.controller";
import { WebpayReconciliationCron } from "./webpay-reconciliation.cron";
import { Transaction } from "../../repository/transaction/transaction.entity";
import { Usuario } from "src/repository/user/user.entity";
import { StockModule } from "../stock/stock.module";
import { Empleador } from "src/repository/employer/employer.entity";

@Module({
  imports: [
    TypeOrmModule.forFeature([Transaction, Usuario, Empleador]),
    StockModule,
  ],
  controllers: [WebpayController],
  providers: [WebpayService, WebpayReconciliationCron],
  exports: [WebpayService],
})
export class WebpayModule { }
