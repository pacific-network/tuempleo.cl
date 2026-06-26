import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ProcesoSeleccion } from "src/repository/hiring_process/hiring_process.entity";
import { Entrevista } from "src/repository/hiring_process/entrevista.entity";
import { Postulacion } from "src/repository/applications/applications.entity";
import { Empleador } from "src/repository/employer/employer.entity";
import { CrearEntrevistaDto } from "./dto/crear-entrevista.dto";
import { ActualizarEntrevistaDto } from "./dto/actualizar-entrevista.dto";

@Injectable()
export class ProcesoSeleccionService {
    constructor(
        @InjectRepository(ProcesoSeleccion)
        private readonly procesoRepo: Repository<ProcesoSeleccion>,

        @InjectRepository(Postulacion)
        private readonly postulacionRepo: Repository<Postulacion>,

        @InjectRepository(Empleador)
        private readonly empleadorRepo: Repository<Empleador>,

        @InjectRepository(Entrevista)
        private readonly entrevistaRepo: Repository<Entrevista>,
    ) { }

    async gestionarSeleccion(
        postulacionId: number,
        empleadorId: number,
        estado: 'preseleccionado' | 'seleccionado' | 'descartado' | 'contratado',
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
            case 'seleccionado':
                estadoPostulacion = 'seleccionado';
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

    // ======================================================
    // 📨 Listar postulaciones por empresa (para notificaciones)
    // ======================================================
    async listarPostulacionesPorEmpresa(empresaId: number) {
        if (!empresaId) {
            throw new BadRequestException('El ID de la empresa es requerido.');
        }

        const postulaciones = await this.postulacionRepo
            .createQueryBuilder('post')
            .leftJoinAndSelect('post.postulante', 'postulante')
            .leftJoinAndSelect('postulante.usuario', 'usuario')
            .leftJoinAndSelect('post.oferta', 'oferta')
            .where('oferta.empresa_id = :empresaId', { empresaId })
            .andWhere('post.estado IS NOT NULL')
            .orderBy('post.fechaPostulacion', 'DESC')
            .getMany();

        if (!postulaciones.length) {
            throw new NotFoundException(`No se encontraron postulaciones para la empresa ${empresaId}`);
        }

        return postulaciones.map((p) => ({
            id: p.id,
            fechaPostulacion: p.fechaPostulacion,
            estado: p.estado,
            oferta: {
                id: p.oferta?.id,
                titulo: p.oferta?.titulo,
            },
            postulante: {
                id: p.postulante?.id,
                usuario: {
                    nombres: p.postulante?.usuario?.nombres,
                    apellidos: p.postulante?.usuario?.apellidos,
                    email: p.postulante?.usuario?.email,
                },
            },
        }));
    }

    async cualificarPostulante(postulacionId: number, userId: number) {
        const postulacion = await this.postulacionRepo.findOne({
            where: { id: postulacionId },
            relations: ['oferta', 'oferta.empleador', 'oferta.empleador.usuario', 'postulante'],
        });

        if (!postulacion) {
            throw new NotFoundException('Postulación no encontrada');
        }

        // Aquí la validación correcta:
        // El dueño de la oferta es el empleador.usuario.id
        if (postulacion.oferta.empleador.usuario.id !== userId) {
            throw new BadRequestException('El empleador no es dueño de la oferta');
        }

        postulacion.estado = 'cualificado';

        return this.postulacionRepo.save(postulacion);
    }

    // ======================================================
    // 📅 ENTREVISTAS / CIERRE DEL PROCESO
    // ======================================================

    // Helper: valida que el usuario (empleador) sea dueño de la oferta de la
    // postulación y devuelve { postulacion, gestor }.
    private async validarDuenioPostulacion(postulacionId: number, userId: number) {
        const postulacion = await this.postulacionRepo.findOne({
            where: { id: postulacionId },
            relations: ['oferta', 'oferta.empleador', 'oferta.empleador.usuario'],
        });
        if (!postulacion) throw new NotFoundException('Postulación no encontrada');
        if (postulacion.oferta?.empleador?.usuario?.id !== userId) {
            throw new ForbiddenException('El empleador no es dueño de la oferta');
        }

        const gestor = await this.empleadorRepo.findOne({ where: { usuario: { id: userId } } });
        return { postulacion, gestor };
    }

    // Helper: valida que la entrevista pertenezca a una oferta del empleador.
    private async obtenerEntrevistaDelEmpleador(entrevistaId: number, userId: number) {
        const entrevista = await this.entrevistaRepo.findOne({
            where: { id: entrevistaId },
            relations: ['postulacion', 'postulacion.oferta', 'postulacion.oferta.empleador', 'postulacion.oferta.empleador.usuario'],
        });
        if (!entrevista) throw new NotFoundException('Entrevista no encontrada');
        if (entrevista.postulacion?.oferta?.empleador?.usuario?.id !== userId) {
            throw new ForbiddenException('El empleador no es dueño de esta entrevista');
        }
        return entrevista;
    }

    async agendarEntrevista(postulacionId: number, userId: number, dto: CrearEntrevistaDto) {
        const { postulacion, gestor } = await this.validarDuenioPostulacion(postulacionId, userId);

        const entrevista = this.entrevistaRepo.create({
            postulacion,
            creadoPor: gestor ?? null,
            fecha_propuesta: new Date(dto.fecha_propuesta),
            modalidad_contacto: dto.modalidad_contacto,
            detalle_contacto: dto.detalle_contacto,
            mensaje: dto.mensaje ?? null,
            duracion_min: dto.duracion_min ?? 30,
            estado: 'propuesta',
        });
        const guardada = await this.entrevistaRepo.save(entrevista);

        // Al agendar una entrevista el candidato avanza al menos a 'seleccionado'.
        if (['enviada', 'vista', 'en_revision', 'cualificado', 'preseleccionado'].includes(postulacion.estado)) {
            postulacion.estado = 'seleccionado';
            await this.postulacionRepo.save(postulacion);
        }

        return guardada;
    }

    async reprogramarEntrevista(entrevistaId: number, userId: number, dto: ActualizarEntrevistaDto) {
        const entrevista = await this.obtenerEntrevistaDelEmpleador(entrevistaId, userId);

        if (dto.fecha_propuesta !== undefined) {
            entrevista.fecha_propuesta = new Date(dto.fecha_propuesta);
            entrevista.estado = 'reprogramada';
        }
        if (dto.modalidad_contacto !== undefined) entrevista.modalidad_contacto = dto.modalidad_contacto;
        if (dto.detalle_contacto !== undefined) entrevista.detalle_contacto = dto.detalle_contacto;
        if (dto.mensaje !== undefined) entrevista.mensaje = dto.mensaje;
        if (dto.duracion_min !== undefined) entrevista.duracion_min = dto.duracion_min;

        return this.entrevistaRepo.save(entrevista);
    }

    async cambiarEstadoEntrevista(
        entrevistaId: number,
        userId: number,
        estado: Entrevista['estado'],
    ) {
        const entrevista = await this.obtenerEntrevistaDelEmpleador(entrevistaId, userId);
        entrevista.estado = estado;
        return this.entrevistaRepo.save(entrevista);
    }

    // Candidato: entrevistas de sus postulaciones (notificación in-app).
    async listarEntrevistasDelPostulante(userId: number) {
        return this.entrevistaRepo
            .createQueryBuilder('e')
            .leftJoinAndSelect('e.postulacion', 'post')
            .leftJoinAndSelect('post.postulante', 'postulante')
            .leftJoinAndSelect('postulante.usuario', 'usuario')
            .leftJoinAndSelect('post.oferta', 'oferta')
            .leftJoinAndSelect('oferta.empresa', 'empresa')
            .where('usuario.id = :userId', { userId })
            .orderBy('e.fecha_propuesta', 'DESC')
            .getMany();
    }

    // Empleador: entrevistas agendadas por su empresa.
    async listarEntrevistasPorEmpresa(empresaId: number) {
        if (!empresaId) throw new BadRequestException('El ID de la empresa es requerido.');
        return this.entrevistaRepo
            .createQueryBuilder('e')
            .leftJoinAndSelect('e.postulacion', 'post')
            .leftJoinAndSelect('post.postulante', 'postulante')
            .leftJoinAndSelect('postulante.usuario', 'usuario')
            .leftJoinAndSelect('post.oferta', 'oferta')
            .where('oferta.empresa_id = :empresaId', { empresaId })
            .orderBy('e.fecha_propuesta', 'DESC')
            .getMany();
    }









}
