import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ProcesoSeleccionController } from "./hiring_process.controller";
import { ProcesoSeleccionService } from "./hiring_process.service";
import { ProcesoSeleccion } from "src/repository/hiring_process/hiring_process.entity";
import { Entrevista } from "src/repository/hiring_process/entrevista.entity";
import { Postulacion } from "src/repository/applications/applications.entity";
import { Empleador } from "src/repository/employer/employer.entity";
import { Postulante } from "src/repository/postulant/postulant.entity";

@Module({
    imports: [
        TypeOrmModule.forFeature([ProcesoSeleccion, Entrevista, Postulacion, Empleador, Postulante]),
    ],
    controllers: [ProcesoSeleccionController],
    providers: [ProcesoSeleccionService],
    exports: [ProcesoSeleccionService],
})
export class HiringProcessModule { }