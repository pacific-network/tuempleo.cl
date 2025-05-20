import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Oferta } from "../../repository/job_offer/job-offer.entity";
import { Empleador } from "../../repository/employer/employer.entity";
import { Empresa } from "../../repository/business/business.entity";
import { OfertaService } from "./oferta.service";
import { OfertaController } from "./oferta.controller";

@Module({
    imports: [
        TypeOrmModule.forFeature([Oferta, Empleador, Empresa]),
    ],
    providers: [OfertaService],
    controllers: [OfertaController],
})
export class OfertaModule { }