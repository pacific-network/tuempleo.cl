// src/modules/webpay/webpay.module.ts

import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { WebpayService } from "./webpay.service";
import { WebpayController } from "./webpay.controller";
import { Transaction } from "../../repository/transaction/transaction.entity";

@Module({
  imports: [TypeOrmModule.forFeature([Transaction])],
  controllers: [WebpayController],
  providers: [WebpayService],
  exports: [WebpayService],
})
export class WebpayModule {}
