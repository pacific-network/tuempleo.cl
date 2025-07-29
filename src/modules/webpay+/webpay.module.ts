// src/modules/webpay/webpay.module.ts

import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { WebpayService } from "./webpay.service";
import { WebpayController } from "./webpay.controller";
import { Transaction } from "../../repository/transaction/transaction.entity";
import { Usuario } from "src/repository/user/user.entity";

@Module({
  imports: [TypeOrmModule.forFeature([Transaction, Usuario])],
  controllers: [WebpayController],
  providers: [WebpayService],
  exports: [WebpayService],
})
export class WebpayModule {}
