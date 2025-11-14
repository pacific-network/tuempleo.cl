import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Oferta } from "../../repository/job_offer/job-offer.entity";
import { Empleador } from "../../repository/employer/employer.entity";
import { Empresa } from "../../repository/business/business.entity";
import { OfertaService } from "./oferta.service";
import { OfertaController } from "./oferta.controller";

import { StockModule } from "../stock/stock.module";
import { CountVisitService } from "./count-visit.service";
import { CountVisit } from "src/repository/count_visits/count-visits.entity";
import { Planes } from "src/repository/plans/plans.entity";

@Module({
  imports: [
    TypeOrmModule.forFeature([Oferta, Empleador, Empresa, CountVisit]), StockModule,
  ],
  providers: [OfertaService, CountVisitService],
  controllers: [OfertaController],
})
export class OfertaModule { }
