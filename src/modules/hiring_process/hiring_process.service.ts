import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ProcesoSeleccion } from "src/repository/hiring_process/hiring_process.entity";
import { Postulacion } from "src/repository/applications/applications.entity";
import { Empleador } from "src/repository/employer/employer.entity";


@Injectable()
export class ProcesoSeleccionService {
    constructor(
        @InjectRepository(ProcesoSeleccion)
        private readonly procesoRepo: Repository<ProcesoSeleccion>,

        @InjectRepository(Postulacion)
        private readonly postulacionRepo: Repository<Postulacion>,
    ) { }

    async gestionarSeleccion(
        postulacionId: number,
        empleadorId: number,
        estado: 'preseleccionado' | 'descartado' | 'contratado',
        observaciones?: string,
    ) {
        const postulacion = await this.postulacionRepo.findOne({ where: { id: postulacionId } });
        if (!postulacion) throw new NotFoundException('Postulación no encontrada');

        await this.postulacionRepo.update(postulacionId, { estado: estado as any });

        const proceso = this.procesoRepo.create({
            postulacion,
            gestor: { id: empleadorId } as Empleador,
            estado,
            observaciones,
        });
        await this.procesoRepo.save(proceso);

        return { success: true };
    }
}
