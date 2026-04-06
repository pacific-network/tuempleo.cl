import { Injectable, NotAcceptableException, NotFoundException } from "@nestjs/common";
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

    async createEmployerWithCompany(
        createEmployerDto: CreateEmployerDto,
        empresaId: number,
    ): Promise<Empleador> {
        // 1. Buscar usuario por id
        const usuario = await this.usuarioRepository.findOne({
            where: { id: createEmployerDto.userId },
        });

        if (!usuario) {
            throw new NotAcceptableException('Usuario no encontrado');
        }

        // 2. Actualizar rut en usuario
        usuario.rut = createEmployerDto.rut;
        await this.usuarioRepository.save(usuario);

        // 3. Buscar empresa
        const empresa = await this.empresaRepository.findOne({
            where: { id: empresaId },
        });

        if (!empresa) {
            throw new NotAcceptableException('Empresa no encontrada');
        }

        // 4. Crear empleador relacionado al usuario y empresa
        const empleador = this.empleadorRepository.create({
            usuario,
            empresa,
            data: createEmployerDto.data,
        });

        // 5. Guardar y retornar
        return await this.empleadorRepository.save(empleador);
    }

    async findEmployerByUserId(userId: number): Promise<Empleador | null> {
        return this.empleadorRepository.findOne({
            where: { usuario: { id: userId } },
            relations: ['empresa', 'usuario'],
        });
    }

    async findBasicInfo(userId: number): Promise<EmpleadorBasicInfoDto> {
        const empleador = await this.empleadorRepository.findOne({
            where: { usuario: { id: userId } },
            relations: ['empresa'],
            // ¡NO pongas select si quieres acceder a relaciones!
        });

        if (!empleador) {
            throw new NotFoundException(`Empleador con usuario ID ${userId} no encontrado`);
        }

        return {
            empleador_id: empleador.id,
            empresa_id: empleador.empresa?.id || null,
        };
    }

    async BusinessEmployer(userId: number): Promise<Empresa | null> {
        const empleador = await this.empleadorRepository.findOne({
            where: { usuario: { id: userId } },
            relations: ['empresa'],
        });

        if (!empleador) {
            return null;
        }

        return empleador.empresa;
    }

    //update empresa by userId 
    async updateEmployerBusiness(userId: number, dto: UpdateBusinessDto): Promise<Empresa> {
        const empleador = await this.empleadorRepository.findOne({
            where: { usuario: { id: userId } },
            relations: ['empresa'],
        });

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
        const empleador = await this.empleadorRepository.findOne({
            where: { usuario: { id: userId } },
        });

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
        const empleador = await this.empleadorRepository.findOne({
            where: { usuario: { id: userId } },
            relations: ['empresa'],
        });

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

        // Actualizar data del empleador
        const empleador = await this.empleadorRepository.findOne({
            where: { usuario: { id: userId } },
            relations: ['empresa', 'usuario'],
        });

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
