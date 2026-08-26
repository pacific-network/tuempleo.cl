import { Injectable, ConflictException, NotAcceptableException, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, Between } from "typeorm";
import { Empresa } from "src/repository/business/business.entity";
import { Usuario } from "src/repository/user/user.entity";
import { Empleador } from "src/repository/employer/employer.entity";
import { Oferta } from "src/repository/job_offer/job-offer.entity";
import { Postulacion } from "src/repository/applications/applications.entity";
import { CreateEmployerDto } from "../employer/dto/create-employer.dto";
import { EmpleadorBasicInfoDto } from "./dto/basic-info.dto";
import { UpdateBusinessDto } from "../business/dto/update-business.dto";
import { UpdateEmployerDto } from "./dto/update-employer.dto";
import { OnboardingMiembroDto } from "./dto/onboarding-miembro.dto";
import { GuardarResponsableDto, AgregarEmpresaDto } from "./dto/onboarding-responsable.dto";
import { PageDto } from "src/shared/pagination/page.dto";
import { PageOptionsDto } from "src/shared/pagination/page-options.dto";
import { PageMetaDto } from "src/shared/pagination/page-meta.dto";
import { StockService } from "../stock/stock.service";

@Injectable()
export class EmpleadorService {
    empleadorRepo: any;
    constructor(
        @InjectRepository(Empleador)
        private readonly empleadorRepository: Repository<Empleador>,
        @InjectRepository(Usuario)
        private readonly usuarioRepository: Repository<Usuario>,
        @InjectRepository(Empresa)
        private readonly empresaRepository: Repository<Empresa>,
        @InjectRepository(Oferta)
        private readonly ofertaRepository: Repository<Oferta>,
        @InjectRepository(Postulacion)
        private readonly postulacionRepository: Repository<Postulacion>,
        private readonly stockService: StockService,
    ) { }

    /**
     * Verifica si un RUT ya está tomado por otro usuario (índice único en usuario.rut).
     * excludeUserId permite que el propio dueño del RUT no se autodetecte como conflicto.
     */
    async checkRutUsuarioExists(
        rut: string,
        excludeUserId?: number,
    ): Promise<{ exists: boolean; disponible: boolean }> {
        const usuario = await this.usuarioRepository.findOne({ where: { rut } });
        if (!usuario) return { exists: false, disponible: true };
        const esPropio = excludeUserId !== undefined && usuario.id === excludeUserId;
        return { exists: true, disponible: esPropio };
    }

    // ======================================================
    // ONBOARDING EN DOS PASOS
    // ======================================================

    /**
     * Paso 1 — el responsable, sin empresa.
     *
     * Se guarda en `usuario` y no en una membresía porque el formulario lo pide
     * antes de que exista ninguna empresa. Deja a la persona en un estado que
     * antes no existía: responsable completo, cero empresas.
     */
    async guardarResponsable(
        userId: number,
        dto: GuardarResponsableDto,
    ): Promise<{ userId: number; empresas: number }> {
        const usuario = await this.usuarioRepository.findOne({ where: { id: userId } });
        if (!usuario) throw new NotFoundException('Usuario no encontrado');

        // El RUT propio no es conflicto; el de otra persona sí.
        if (usuario.rut !== dto.rut) {
            const { disponible } = await this.checkRutUsuarioExists(dto.rut, userId);
            if (!disponible) {
                throw new ConflictException('El RUT ya está registrado por otro usuario');
            }
        }

        usuario.nombres = dto.nombres;
        usuario.apellidos = dto.apellidos;
        usuario.rut = dto.rut;
        usuario.data = { ...(usuario.data ?? {}), ...dto.data };
        await this.usuarioRepository.save(usuario);

        const empresas = await this.empleadorRepository.count({
            where: { usuario: { id: userId } },
        });

        return { userId, empresas };
    }

    /**
     * Paso 2 — agrega UNA empresa. Se puede llamar tantas veces como empresas
     * tenga la persona, desde el onboarding o después desde el panel.
     *
     * Cada llamada es su propia transacción, a propósito: agregar tres empresas
     * son tres operaciones independientes, no una sola de tres partes. Si la
     * tercera falla, las dos primeras quedan bien y se reintenta solo esa —
     * que es lo que hacía falta para que "agregar más" no repita el problema
     * de la empresa huérfana.
     */
    async agregarEmpresa(
        userId: number,
        dto: AgregarEmpresaDto,
    ): Promise<{ empresaId: number; empleadorId: number; activa: boolean }> {
        const usuario = await this.usuarioRepository.findOne({ where: { id: userId } });
        if (!usuario) throw new NotFoundException('Usuario no encontrado');

        if (!usuario.rut || !usuario.data) {
            throw new ConflictException(
                'Completá primero tus datos de responsable',
            );
        }

        const yaExiste = await this.empresaRepository.findOne({
            where: { rut: dto.business.rut },
        });
        if (yaExiste) {
            // El RUT de empresa es único a propósito: dos filas para la misma
            // empresa parten cupos, ofertas y pagos entre las copias.
            throw new ConflictException(
                'Ya existe una empresa registrada con ese RUT',
            );
        }

        const creado = await this.empleadorRepository.manager.transaction(
            async (manager) => {
                const empresa = manager.create(Empresa, {
                    rut: dto.business.rut,
                    razon_social: dto.business.razon_social,
                    nombre_fantasia: dto.business.nombre_fantasia,
                    data: dto.business.data as any,
                    modificado_por: userId,
                });
                await manager.save(empresa);

                const membresia = manager.create(Empleador, {
                    usuario,
                    empresa,
                    rol_empresa: 'empleador' as const,
                    data: { cargo: dto.cargo },
                    modificado_por: userId,
                });
                await manager.save(membresia);

                return { empresa, membresia };
            },
        );

        // La primera empresa queda activa; las siguientes no roban el foco.
        const esLaPrimera = !usuario.id_empresa;
        if (esLaPrimera) {
            await this.usuarioRepository.update(userId, {
                id_empresa: creado.empresa.id,
            });
        }

        return {
            empresaId: creado.empresa.id,
            empleadorId: creado.membresia.id,
            activa: esLaPrimera,
        };
    }

    /**
     * Todas las membresías de la persona, una por empresa.
     */
    async getMembresias(userId: number): Promise<Empleador[]> {
        return this.empleadorRepository.find({
            where: { usuario: { id: userId } },
            relations: ['empresa'],
            order: { id: 'ASC' },
        });
    }

    /**
     * Membresía activa de la persona: la que apunta a `usuario.id_empresa`.
     *
     * `id_empresa` es la empresa seleccionada, no la única. Si está vacío o
     * apunta a una empresa donde ya no hay membresía (por ejemplo porque la
     * dejó), cae a la primera membresía y la fija como activa, para que el
     * resto del backend nunca tenga que resolver la ambigüedad.
     */
    async getEmpleadorActivo(userId: number): Promise<Empleador | null> {
        const usuario = await this.usuarioRepository.findOne({ where: { id: userId } });
        if (!usuario) return null;

        if (usuario.id_empresa) {
            const activo = await this.empleadorRepository.findOne({
                where: { usuario: { id: userId }, empresa: { id: usuario.id_empresa } },
                relations: ['empresa', 'usuario'],
            });
            if (activo) return activo;
        }

        const membresias = await this.getMembresias(userId);
        if (!membresias.length) return null;

        const primera = membresias[0];
        await this.usuarioRepository.update(userId, { id_empresa: primera.empresa.id });
        return primera;
    }

    /**
     * Cambia la empresa activa. Solo a una donde la persona tenga membresía:
     * sin esta validación, `id_empresa` sería una forma de operar sobre
     * cualquier empresa pasando su id.
     */
    async setEmpresaActiva(userId: number, empresaId: number): Promise<Empleador> {
        const membresia = await this.empleadorRepository.findOne({
            where: { usuario: { id: userId }, empresa: { id: empresaId } },
            relations: ['empresa'],
        });
        if (!membresia) {
            throw new NotFoundException('No tienes acceso a esta empresa');
        }
        await this.usuarioRepository.update(userId, { id_empresa: empresaId });
        return membresia;
    }

    /**
     * Cuántos empleadores tiene la empresa.
     */
    async contarEmpleadores(empresaId: number): Promise<number> {
        return this.empleadorRepository.count({
            where: { empresa: { id: empresaId }, rol_empresa: 'empleador' },
        });
    }

    /**
     * Invariante del modelo: una empresa nunca se queda sin empleador.
     *
     * Se llama antes de degradar a un empleador, de quitarle la membresía o de
     * borrar su cuenta. Sin esto la empresa queda solo con colaboradores, que no
     * pueden invitar a nadie ni verificarla, y solo se arregla a mano.
     */
    async assertNoEsUltimoEmpleador(empleador: Empleador): Promise<void> {
        if (empleador.rol_empresa !== 'empleador') return;

        const empresaId = empleador.empresa?.id;
        if (!empresaId) return;

        const empleadores = await this.contarEmpleadores(empresaId);
        if (empleadores <= 1) {
            const nombre = empleador.empresa?.nombre_fantasia
                || empleador.empresa?.razon_social
                || `empresa ${empresaId}`;
            throw new ConflictException(
                `Sos el único empleador de ${nombre}. Promové a un colaborador antes de dejar de serlo.`,
            );
        }
    }

    async checkEmpleadorExists(userId: number): Promise<{
        exists: boolean;
        empleador?: { id: number; empresaId: number };
        membresias: { id: number; empresaId: number; rol: 'empleador' | 'colaborador'; nombre: string }[];
    }> {
        const membresias = await this.getMembresias(userId);
        const activo = await this.getEmpleadorActivo(userId);

        const lista = membresias.map((m) => ({
            id: m.id,
            empresaId: m.empresa?.id,
            rol: m.rol_empresa,
            nombre: m.empresa?.nombre_fantasia || m.empresa?.razon_social || '',
        }));

        if (!activo) return { exists: false, membresias: lista };

        // `empleador` sigue devolviendo la membresía activa en singular para no
        // romper a los consumidores previos a multi-empresa.
        return {
            exists: true,
            empleador: { id: activo.id, empresaId: activo.empresa?.id },
            membresias: lista,
        };
    }

    async createEmployerWithCompany(
        createEmployerDto: CreateEmployerDto,
        empresaId: number,
    ): Promise<Empleador> {
        // 0. Verificar que no exista membresía de este usuario EN ESTA EMPRESA.
        //    Antes se rechazaba cualquier empleador previo, lo que impedía que
        //    una persona fuera responsable de más de una empresa.
        const existente = await this.empleadorRepository.findOne({
            where: {
                usuario: { id: createEmployerDto.userId },
                empresa: { id: empresaId },
            },
        });
        if (existente) {
            throw new ConflictException('Ya tienes un perfil de empleador en esta empresa');
        }

        // 1. Buscar usuario por id
        const usuario = await this.usuarioRepository.findOne({
            where: { id: createEmployerDto.userId },
        });

        if (!usuario) {
            throw new NotAcceptableException('Usuario no encontrado');
        }

        // 2. Actualizar rut en usuario (validando el índice único antes de escribir,
        //    para no reventar con ER_DUP_ENTRY a mitad del onboarding)
        if (usuario.rut !== createEmployerDto.rut) {
            const { disponible } = await this.checkRutUsuarioExists(
                createEmployerDto.rut,
                usuario.id,
            );
            if (!disponible) {
                throw new ConflictException(
                    'El RUT ya está registrado por otro usuario',
                );
            }
            usuario.rut = createEmployerDto.rut;
            await this.usuarioRepository.save(usuario);
        }

        // 3. Buscar empresa
        const empresa = await this.empresaRepository.findOne({
            where: { id: empresaId },
        });

        if (!empresa) {
            throw new NotAcceptableException('Empresa no encontrada');
        }

        // 4. Crear la membresía. Quien crea la empresa queda como empleador de ella.
        const empleador = this.empleadorRepository.create({
            usuario,
            empresa,
            rol_empresa: 'empleador',
            data: createEmployerDto.data,
        });

        // 5. Guardar y retornar
        return await this.empleadorRepository.save(empleador);
    }

    /**
     * Cambia el rol de una membresía, bajo una sola regla:
     * **el poder se puede dar, no se puede quitar.**
     *
     * - Promover un colaborador a empleador: cualquier empleador de la empresa.
     * - Dejar de ser empleador: solo sobre la propia membresía, y solo si queda
     *   otro empleador.
     *
     * Nadie degrada a un par. La razón es que el sistema no sabe —ni tiene cómo
     * saber— quién es la autoridad dentro de una empresa: quien completó el
     * registro pudo ser el dueño, un supervisor o un tercero, y tratar ese
     * accidente como jerarquía sería inventarse un dato que no tenemos. Al no
     * distinguir quién creó la empresa, la regla vale igual en los tres casos.
     *
     * El costo, asumido: si alguien se va en malos términos y no renuncia,
     * conserva el acceso hasta que soporte lo saque a mano. Es preferible a que
     * cualquiera pueda expulsar por sorpresa a quien administra la empresa.
     *
     * Transferir es promover al otro y después renunciar: dos pasos, sin
     * operación especial.
     */
    async cambiarRolMembresia(
        actorUserId: number,
        empleadorId: number,
        rol: 'empleador' | 'colaborador',
    ): Promise<Empleador> {
        const objetivo = await this.empleadorRepository.findOne({
            where: { id: empleadorId },
            relations: ['empresa', 'usuario'],
        });
        if (!objetivo) {
            throw new NotFoundException('Membresía no encontrada');
        }

        const actor = await this.empleadorRepository.findOne({
            where: {
                usuario: { id: actorUserId },
                empresa: { id: objetivo.empresa.id },
            },
        });
        if (!actor || actor.rol_empresa !== 'empleador') {
            throw new ConflictException(
                'Solo un empleador de esta empresa puede cambiar roles',
            );
        }

        if (objetivo.rol_empresa === rol) return objetivo;

        if (rol === 'colaborador') {
            // Solo se renuncia; a un par no se lo baja.
            if (actor.id !== objetivo.id) {
                throw new ConflictException(
                    'Un empleador no puede quitarle el rol a otro. Solo esa persona puede dejarlo.',
                );
            }
            await this.assertNoEsUltimoEmpleador(objetivo);
        }

        objetivo.rol_empresa = rol;
        objetivo.modificado_por = actorUserId;
        return this.empleadorRepository.save(objetivo);
    }

    /**
     * Membresía activa de la persona. Antes de multi-empresa devolvía la única
     * que podía existir; ahora resuelve por la empresa seleccionada.
     */
    async findEmployerByUserId(userId: number): Promise<Empleador | null> {
        return this.getEmpleadorActivo(userId);
    }

    async findBasicInfo(userId: number): Promise<EmpleadorBasicInfoDto> {
        const empleador = await this.getEmpleadorActivo(userId);

        if (!empleador) {
            throw new NotFoundException(`Empleador con usuario ID ${userId} no encontrado`);
        }

        return {
            empleador_id: empleador.id,
            empresa_id: empleador.empresa?.id || null,
        };
    }

    async BusinessEmployer(userId: number): Promise<Empresa | null> {
        const empleador = await this.getEmpleadorActivo(userId);

        if (!empleador) {
            return null;
        }

        return empleador.empresa;
    }

    //update empresa by userId 
    async updateEmployerBusiness(userId: number, dto: UpdateBusinessDto): Promise<Empresa> {
        // Sobre la empresa activa: resolver por usuario editaba una empresa al
        // azar cuando la persona administra varias.
        const empleador = await this.getEmpleadorActivo(userId);

        if (!empleador || !empleador.empresa) {
            throw new NotFoundException('Empresa asociada al usuario no encontrada');
        }

        const empresa = empleador.empresa;

        // Solo actualizamos los campos que vinieron en el DTO
        const camposEditables = [
            'nombre_fantasia',
            'telefono',
            'domicilios',
            'descripcion',
            'web_factuacion',
            'logo_url',
        ];

        for (const campo of camposEditables) {
            if (dto[campo] !== undefined) {
                if (campo in empresa.data) {
                    empresa.data[campo] = dto[campo]; // campo dentro de empresa.data
                } else {
                    empresa[campo] = dto[campo]; // campo directamente en empresa
                }
            }
        }

        empresa.fecha_update = new Date();

        return await this.empresaRepository.save(empresa);
    }

    async updateEmployerData(userId: number, dto: UpdateEmployerDto): Promise<Empleador> {
        // `data` es de la membresía (el cargo cambia entre empresas), no de la persona.
        const empleador = await this.getEmpleadorActivo(userId);

        if (!empleador) {
            throw new NotFoundException('Empleador no encontrado');
        }

        if (dto.data) {
            empleador.data = { ...empleador.data, ...dto.data }; // puedes reemplazar si prefieres
        }

        empleador.modificado_por = userId;
        empleador.fecha_update = new Date();

        return this.empleadorRepository.save(empleador);
    }

    async updateCompanyId(usuarioId: number, empresaId: number): Promise<void> {
        await this.usuarioRepository.update(usuarioId, { id_empresa: empresaId });
    }

    async getEstadisticas(userId: number) {
        const empleador = await this.getEmpleadorActivo(userId);

        if (!empleador) {
            throw new NotFoundException(`Empleador con usuario ID ${userId} no encontrado`);
        }

        const empleadorId = empleador.id;
        const empresaId = empleador.empresa?.id;

        // Ofertas por estado
        const ofertasPorEstado = await this.ofertaRepository
            .createQueryBuilder('o')
            .select('o.estado', 'estado')
            .addSelect('COUNT(*)', 'cantidad')
            .where('o.empleador_id = :empleadorId', { empleadorId })
            .groupBy('o.estado')
            .getRawMany();

        const ofertasActivas = await this.ofertaRepository.count({
            where: { empleador: { id: empleadorId }, es_activa: true },
        });

        const totalOfertas = await this.ofertaRepository.count({
            where: { empleador: { id: empleadorId } },
        });

        // Postulaciones totales y por estado
        const totalPostulaciones = await this.postulacionRepository
            .createQueryBuilder('p')
            .innerJoin('p.oferta', 'o')
            .where('o.empleador_id = :empleadorId', { empleadorId })
            .getCount();

        const postulacionesPorEstado = await this.postulacionRepository
            .createQueryBuilder('p')
            .select('p.estado', 'estado')
            .addSelect('COUNT(*)', 'cantidad')
            .innerJoin('p.oferta', 'o')
            .where('o.empleador_id = :empleadorId', { empleadorId })
            .groupBy('p.estado')
            .getRawMany();

        // Postulaciones últimos 7 días (para gráfico de tendencia)
        const hace7Dias = new Date();
        hace7Dias.setDate(hace7Dias.getDate() - 7);

        const postulacionesPorDiaRaw = await this.postulacionRepository
            .createQueryBuilder('p')
            .select('DATE_FORMAT(p.fecha_postulacion, \'%Y-%m-%d\')', 'fecha')
            .addSelect('COUNT(*)', 'cantidad')
            .innerJoin('p.oferta', 'o')
            .where('o.empleador_id = :empleadorId', { empleadorId })
            .andWhere('p.fecha_postulacion >= :desde', { desde: hace7Dias })
            .groupBy('DATE_FORMAT(p.fecha_postulacion, \'%Y-%m-%d\')')
            .orderBy('fecha', 'ASC')
            .getRawMany();

        // Asegurar formato string YYYY-MM-DD
        const postulacionesPorDia = postulacionesPorDiaRaw.map(r => ({
            fecha: String(r.fecha),
            cantidad: Number(r.cantidad),
        }));

        // Postulaciones últimos 30 días (para comparar con período anterior)
        const hace30Dias = new Date();
        hace30Dias.setDate(hace30Dias.getDate() - 30);
        const hace60Dias = new Date();
        hace60Dias.setDate(hace60Dias.getDate() - 60);

        const postulacionesUltimos30 = await this.postulacionRepository
            .createQueryBuilder('p')
            .innerJoin('p.oferta', 'o')
            .where('o.empleador_id = :empleadorId', { empleadorId })
            .andWhere('p.fecha_postulacion >= :desde', { desde: hace30Dias })
            .getCount();

        const postulacionesPeriodoAnterior = await this.postulacionRepository
            .createQueryBuilder('p')
            .innerJoin('p.oferta', 'o')
            .where('o.empleador_id = :empleadorId', { empleadorId })
            .andWhere('p.fecha_postulacion >= :desde', { desde: hace60Dias })
            .andWhere('p.fecha_postulacion < :hasta', { hasta: hace30Dias })
            .getCount();

        // Visitas totales de ofertas activas
        const visitasTotales = await this.ofertaRepository
            .createQueryBuilder('o')
            .select('SUM(o.visits_total)', 'total')
            .where('o.empleador_id = :empleadorId', { empleadorId })
            .getRawOne();

        // Top 5 ofertas con más postulaciones
        const topOfertas = await this.postulacionRepository
            .createQueryBuilder('p')
            .select('o.id', 'oferta_id')
            .addSelect('o.titulo', 'titulo')
            .addSelect('o.es_activa', 'es_activa')
            .addSelect('COUNT(*)', 'postulaciones')
            .addSelect("SUM(CASE WHEN p.estado = 'contratado' THEN 1 ELSE 0 END)", 'contratados')
            .innerJoin('p.oferta', 'o')
            .where('o.empleador_id = :empleadorId', { empleadorId })
            .groupBy('o.id')
            .addGroupBy('o.titulo')
            .addGroupBy('o.es_activa')
            .orderBy('postulaciones', 'DESC')
            .limit(5)
            .getRawMany();

        // Tasa de conversión (visitas → postulaciones)
        const totalVisitas = parseInt(visitasTotales?.total || '0', 10);
        const tasaConversion = totalVisitas > 0
            ? Math.min(100, Math.round((totalPostulaciones / totalVisitas) * 10000) / 100)
            : 0;

        // Métricas del mes actual (últimos 30 días)
        const ofertasMes = await this.ofertaRepository
            .createQueryBuilder('o')
            .where('o.empleador_id = :empleadorId', { empleadorId })
            .andWhere('o.fecha_publicacion >= :desde', { desde: hace30Dias })
            .getCount();

        const visitasMesRaw = await this.ofertaRepository
            .createQueryBuilder('o')
            .select('SUM(o.visits_total)', 'total')
            .where('o.empleador_id = :empleadorId', { empleadorId })
            .andWhere('o.fecha_publicacion >= :desde', { desde: hace30Dias })
            .getRawOne();
        const visitasMes = parseInt(visitasMesRaw?.total || '0', 10);

        const tasaConversionMes = visitasMes > 0
            ? Math.min(100, Math.round((postulacionesUltimos30 / visitasMes) * 10000) / 100)
            : 0;

        // Stock disponible
        let avisosDisponibles = 0;
        let stockDetalle: any = null;
        if (empresaId) {
            const { gratis, pagados } = await this.stockService.getFullAvailability(empresaId);
            avisosDisponibles = (gratis?.cantidad_disponible ?? 0)
                + pagados.reduce((sum, s) => sum + (s.cantidad_disponible ?? 0), 0);
            stockDetalle = { gratis, pagados };
        }

        return {
            resumen: {
                ofertas_activas: ofertasActivas,
                total_ofertas: totalOfertas,
                total_postulaciones: totalPostulaciones,
                total_visitas: totalVisitas,
                tasa_conversion: tasaConversion,
                avisos_disponibles: avisosDisponibles,
            },
            ofertas_por_estado: ofertasPorEstado,
            postulaciones_por_estado: postulacionesPorEstado,
            tendencia: {
                postulaciones_por_dia: postulacionesPorDia,
                ultimos_30_dias: postulacionesUltimos30,
                periodo_anterior_30_dias: postulacionesPeriodoAnterior,
                variacion_porcentual: postulacionesPeriodoAnterior > 0
                    ? Math.round(((postulacionesUltimos30 - postulacionesPeriodoAnterior) / postulacionesPeriodoAnterior) * 10000) / 100
                    : null,
            },
            top_ofertas: topOfertas,
            stock: stockDetalle,
            mes_actual: {
                ofertas_publicadas: ofertasMes,
                postulaciones: postulacionesUltimos30,
                visitas: visitasMes,
                tasa_conversion: tasaConversionMes,
            },
        };
    }

    async onboardingMiembro(userId: number, dto: OnboardingMiembroDto): Promise<Empleador> {
        // Actualizar datos del usuario
        const usuario = await this.usuarioRepository.findOne({ where: { id: userId } });
        if (!usuario) {
            throw new NotFoundException('Usuario no encontrado');
        }

        usuario.nombres = dto.nombres;
        usuario.apellidos = dto.apellidos;
        usuario.rut = dto.rut;
        await this.usuarioRepository.save(usuario);

        // Actualizar data de la membresía activa
        const empleador = await this.getEmpleadorActivo(userId);

        if (!empleador) {
            throw new NotFoundException('Empleador no encontrado');
        }

        empleador.data = dto.data;
        empleador.fecha_update = new Date();
        empleador.modificado_por = userId;

        return this.empleadorRepository.save(empleador);
    }

    async findAllEmployers(
        empleadorId: number,
        pageOptions: PageOptionsDto
    ): Promise<PageDto<Empleador>> {
        const queryBuilder = this.empleadorRepository.createQueryBuilder('empleador')
            .leftJoinAndSelect('empleador.usuario', 'usuario')
            .leftJoinAndSelect('empleador.empresa', 'empresa')
            .where('empleador.id = :empleadorId', { empleadorId })
            .skip(pageOptions.skip)
            .take(pageOptions.take);

        const [entities, total] = await queryBuilder.getManyAndCount();

        const meta = new PageMetaDto({
            pageOptionsDto: pageOptions,
            itemCount: total,
        });

        return new PageDto(entities, meta);
    }





}
