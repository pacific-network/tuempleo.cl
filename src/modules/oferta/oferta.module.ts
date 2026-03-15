import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { Oferta } from "../../repository/job_offer/job-offer.entity";
import { Empleador } from "../../repository/employer/employer.entity";
import { Empresa } from "../../repository/business/business.entity";
import { CountVisit } from "src/repository/count_visits/count-visits.entity";
import { StockGratis } from "src/repository/free_stock/free-stock.entity";
import { ProcesoSeleccion } from "src/repository/hiring_process/hiring_process.entity";

import { OfertaService } from "./oferta.service";
import { OfertaController } from "./oferta.controller";
import { OfertaStatusService } from "./oferta-status/oferta-status.service";
import { OfertaStatusCron } from "./oferta-status/oferta-status.cron";

import { StockModule } from "../stock/stock.module";
import { CountVisitService } from "./count-visit.service";
import { jobOfferRepository } from "src/repository/job_offer/job-offer.repository";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Oferta,
      Empleador,
      Empresa,
      CountVisit,
      StockGratis,
      ProcesoSeleccion,
    ]),
    StockModule,
  ],
  providers: [
    OfertaService,
    OfertaStatusService,
    OfertaStatusCron,
    CountVisitService,
    jobOfferRepository,
  ],
  controllers: [OfertaController],
})
export class OfertaModule { }
