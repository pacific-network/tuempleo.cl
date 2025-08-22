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

        @InjectRepository(Empleador)
        private readonly empleadorRepo: Repository<Empleador>,
    ) { }

    async gestionarSeleccion(
        postulacionId: number,
        empleadorId: number,
        estado: 'preseleccionado' | 'descartado' | 'contratado',
        observaciones?: string,
    ) {
        console.log('Inicio gestionarSeleccion');
        console.log('postulacionId:', postulacionId);
        console.log('empleadorId:', empleadorId);
        console.log('estado recibido:', estado);
        console.log('observaciones:', observaciones);

        const postulacion = await this.postulacionRepo.findOne({ where: { id: postulacionId } });
        if (!postulacion) {
            console.log('Postulación no encontrada');
            throw new NotFoundException('Postulación no encontrada');
        }
        console.log('Postulación encontrada:', postulacion);

        const gestor = await this.empleadorRepo.findOne({
            where: { usuario: { id: empleadorId } }, // empleador.usuario.id === empleadorId
        });
        if (!gestor) {
            console.log('Empleador no encontrado por usuario_id');
            throw new NotFoundException('Empleador no encontrado');
        }
        console.log('Empleador encontrado:', gestor);

        let estadoPostulacion: Postulacion['estado'];

        switch (estado) {
            case 'preseleccionado':
                estadoPostulacion = 'preseleccionado';
                break;
            case 'descartado':
                estadoPostulacion = 'no_seleccionado';
                break;
            case 'contratado':
                estadoPostulacion = 'contratado';
                break;
            default:
                console.log('Estado no válido:', estado);
                throw new BadRequestException('Estado no válido');
        }

        postulacion.estado = estadoPostulacion;
        const postulacionGuardada = await this.postulacionRepo.save(postulacion);
        console.log('Postulación actualizada:', postulacionGuardada);

        const proceso = this.procesoRepo.create({
            postulacion,
            gestor,
            estado,
            observaciones,
        });
        console.log('Proceso creado:', proceso);

        const procesoGuardado = await this.procesoRepo.save(proceso);
        console.log('Proceso guardado:', procesoGuardado);

        console.log('Fin gestionarSeleccion');
        return { success: true };
    }
    async listarProcesosDelPostulante(userId: number) {
    // Devuelve los procesos que tocan postulaciones cuyo postulante pertenece al usuario autenticado
    return this.procesoRepo
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.postulacion', 'post')
      .leftJoinAndSelect('post.postulante', 'postulante')
      .leftJoinAndSelect('postulante.usuario', 'usuario')
      .leftJoinAndSelect('post.oferta', 'oferta')
      .leftJoinAndSelect('p.gestor', 'gestor')
      .where('usuario.id = :userId', { userId })
      .orderBy('p.fecha', 'DESC')
      .getMany();
  }
}
