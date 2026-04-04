import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Oferta } from "../../repository/job_offer/job-offer.entity";
import { Empleador } from "../../repository/employer/employer.entity";
import { Empresa } from "../../repository/business/business.entity";
import { ProcesoSeleccion } from "../../repository/hiring_process/hiring_process.entity";
import { CreateOfertaDto } from "./dto/create-oferta.dto";
import { PageOptionsDto } from "src/shared/pagination/page-options.dto";
import { PageDto } from "src/shared/pagination/page.dto";
import { PageMetaDto } from "src/shared/pagination/page-meta.dto";
import { UpdateOfertaDto } from "./dto/updadte-oferta.dto";
import { FilterOfertasDto } from "./dto/filter-ofertas.dto";
import { StockService } from "../stock/stock.service";
import { jobOfferRepository } from "../../repository/job_offer/job-offer.repository";
import { Order } from "src/shared/pagination/constants";
import { FreeStockService } from "../stock/free-stock.service";
import { OfertaValidationService } from "./oferta-validation.service";

const priorityMap: Record<'GRATIS' | 'BASICO' | 'ESTANDAR' | 'PREMIUM', number> = {
  GRATIS: 0,
  BASICO: 1,
  ESTANDAR: 2,
  PREMIUM: 4,
};

@Injectable()
export class OfertaService {
  constructor(
    @InjectRepository(Oferta)
    private readonly ofertaRepository: Repository<Oferta>,
    @InjectRepository(Empleador)
    private readonly empleadorRepository: Repository<Empleador>,
    @InjectRepository(Empresa)
    private readonly empresaRepository: Repository<Empresa>,
    @InjectRepository(ProcesoSeleccion)
    private readonly procesoSeleccionRepository: Repository<ProcesoSeleccion>,
    private readonly StockService: StockService,
    private readonly jobOfferRepository: jobOfferRepository,
    private readonly freeStockService: FreeStockService,
    private readonly ofertaValidationService: OfertaValidationService,
  ) { }

  // ======================================================
  // 🔍 FILTRO DE OFERTAS (BUSCADOR PÚBLICO)
  // ======================================================
  public async findAllOfertas(
    pageOptionsDto: PageOptionsDto,
    filters: FilterOfertasDto & { area_trabajo?: string }
  ): Promise<PageDto<Oferta>> {
    const {
      region, comuna, categoria, modalidad,
      q, searchQuery,
      expMin, expMax,
      salarioMin, salarioMax,
      posted,
      expiraAntes, expiraDespues,
      sortBy, order,
      area_trabajo,
    } = filters;

    const s = (v: unknown) => (typeof v === 'string' ? v : '');

    const qb = this.ofertaRepository.createQueryBuilder("oferta")
      .leftJoinAndSelect("oferta.empresa", "empresa")
      .leftJoinAndSelect("oferta.empleador", "empleador")
      .where("oferta.es_activa = :activa", { activa: true })
      .andWhere("oferta.estado = :estado", { estado: 'publicada' })
      .skip(pageOptionsDto.skip)
      .take(pageOptionsDto.take);

    const scoreParts: string[] = [];

    const rawSearch = s(q) || s(searchQuery) || undefined;
    const searchTerm = rawSearch ? rawSearch.trim().toLowerCase() : undefined;
    if (searchTerm) {
      const likeKw = `%${searchTerm}%`;
      // Filtrar: solo ofertas que coincidan en título o descripción
      qb.andWhere(
        `(LOWER(oferta.titulo) LIKE :likeKw OR LOWER(JSON_UNQUOTE(JSON_EXTRACT(oferta.data,'$.descripcion_puesto'))) LIKE :likeKw)`,
        { likeKw },
      );
      // Ranking: título pesa más que descripción
      scoreParts.push(`
        (CASE WHEN LOWER(oferta.titulo) LIKE :likeKw THEN 3 ELSE 0 END)
        +
        (CASE WHEN LOWER(JSON_UNQUOTE(JSON_EXTRACT(oferta.data,'$.descripcion_puesto'))) LIKE :likeKw THEN 2 ELSE 0 END)
      `);
    }

    // Región y comuna
    const regionVal = s(region).trim();
    if (regionVal) {
      qb.andWhere(
        "LOWER(JSON_UNQUOTE(JSON_EXTRACT(oferta.data,'$.region'))) LIKE :region",
        { region: `%${regionVal.toLowerCase()}%` },
      );
    }

    const comunaVal = s(comuna).trim();
    if (comunaVal) {
      qb.andWhere(
        "LOWER(JSON_UNQUOTE(JSON_EXTRACT(oferta.data,'$.comuna'))) LIKE :comuna",
        { comuna: `%${comunaVal.toLowerCase()}%` },
      );
    }

    // Orden
    const scoreExpr = scoreParts.length ? `(${scoreParts.join(' + ')})` : `0`;
    qb.addSelect(scoreExpr, 'rank_score');
    const by = sortBy === 'fecha_cierre' ? 'fecha_cierre' : 'fecha_publicacion';
    const dir = (order === 'ASC' ? 'ASC' : 'DESC') as ('ASC' | 'DESC');
    qb.orderBy('rank_score', 'DESC').addOrderBy(`oferta.${by}`, dir);

    const [entities, itemCount] = await qb.getManyAndCount();
    const meta = new PageMetaDto({ itemCount, pageOptionsDto });

    // Si no hay resultados y hay filtros activos, sugerir ofertas relacionadas
    if (entities.length === 0 && (searchTerm || regionVal || comunaVal)) {
      const sugeridas = await this.obtenerSugeridas(regionVal, 6);
      return Object.assign(new PageDto(entities, meta), { sugeridas });
    }

    return new PageDto(entities, meta);
  }

  /**
   * Obtiene ofertas sugeridas cuando la búsqueda no tiene resultados.
   * Prioridad: misma región > más recientes.
   */
  private async obtenerSugeridas(region: string, limit: number): Promise<Oferta[]> {
    const qb = this.ofertaRepository.createQueryBuilder('oferta')
      .leftJoinAndSelect('oferta.empresa', 'empresa')
      .leftJoinAndSelect('oferta.empleador', 'empleador')
      .where('oferta.es_activa = :activa', { activa: true })
      .andWhere('oferta.estado = :estado', { estado: 'publicada' })
      .take(limit);

    if (region) {
      // Intentar primero con la misma región
      const regionQb = qb.clone()
        .andWhere(
          "LOWER(JSON_UNQUOTE(JSON_EXTRACT(oferta.data,'$.region'))) LIKE :region",
          { region: `%${region.toLowerCase()}%` },
        )
        .orderBy('oferta.priority', 'DESC')
        .addOrderBy('oferta.fecha_publicacion', 'DESC');

      const regionResults = await regionQb.getMany();
      if (regionResults.length > 0) return regionResults;
    }

    // Fallback: ofertas más recientes con mayor prioridad
    return qb
      .orderBy('oferta.priority', 'DESC')
      .addOrderBy('oferta.fecha_publicacion', 'DESC')
      .getMany();
  }


  // async crearOferta(data: CreateOfertaDto): Promise<Oferta> {
  //   // 1️⃣ Empleador
  //   const empleador = await this.empleadorRepository.findOne({
  //     where: { id: data.empleador_id },
  //   });
  //   if (!empleador)
  //     throw new NotFoundException(`Empleador con ID ${data.empleador_id} no encontrado`);

  //   // 2️⃣ Empresa
  //   const empresa = await this.empresaRepository.findOne({
  //     where: { id: data.empresa_id },
  //   });
  //   if (!empresa)
  //     throw new NotFoundException(`Empresa con ID ${data.empresa_id} no encontrada`);

  //   // 3️⃣ Verificar crédito si NO es GRATIS
  //   if (data.tipo_aviso !== 'GRATIS') {
  //     await this.StockService.useCredit(
  //       data.empresa_id,
  //       data.tipo_aviso as 'BASICO' | 'ESTANDAR' | 'PREMIUM'
  //     );
  //   }

  //   // 4️⃣ Calcular fechas seguras
  //   const publicacion = data.fecha_publicacion ? new Date(data.fecha_publicacion) : new Date();
  //   const duracion = data.duracion_publicacion ?? 30;

  //   const fecha_cierre = data.fecha_cierre
  //     ? new Date(data.fecha_cierre)
  //     : new Date(publicacion.getTime() + duracion * 24 * 60 * 60 * 1000);

  //   // 5️⃣ Determinar PRIORIDAD automática
  //   const prioridad = priorityMap[data.tipo_aviso];

  //   // 6️⃣ Crear la oferta
  //   const nuevaOferta: Partial<Oferta> = {
  //     titulo: data.titulo,
  //     tipo_aviso: data.tipo_aviso,
  //     empresa,
  //     empleador,
  //     fecha_publicacion: publicacion,
  //     duracion_publicacion: duracion,
  //     fecha_cierre,
  //     es_activa: data.es_activa ?? true,
  //     data: JSON.stringify(data.data),
  //     priority: prioridad,  // 👈 AQUI QUEDA LA PRIORIDAD AUTOMÁTICA
  //   };

  //   const oferta = this.ofertaRepository.create(nuevaOferta);
  //   const saved = await this.ofertaRepository.save(oferta);

  //   console.log(
  //     `🧾 Oferta creada correctamente: ${saved.titulo} (Empresa ${empresa.id})` +
  //     (data.tipo_aviso === 'GRATIS'
  //       ? ' - Aviso gratuito (no descuenta stock)'
  //       : ` - Crédito descontado (${data.tipo_aviso})`)
  //   );

  //   return saved;
  // }
  async crearOferta(data: CreateOfertaDto): Promise<Oferta> {
    // 0️⃣ Validación automática
    await this.ofertaValidationService.validarOferta(data);

    // 1️⃣ Empleador
    const empleador = await this.empleadorRepository.findOne({
      where: { id: data.empleador_id },
    });
    if (!empleador)
      throw new NotFoundException(`Empleador con ID ${data.empleador_id} no encontrado`);

    // 2️⃣ Empresa
    const empresa = await this.empresaRepository.findOne({
      where: { id: data.empresa_id },
    });
    if (!empresa)
      throw new NotFoundException(`Empresa con ID ${data.empresa_id} no encontrada`);

    // 3️⃣ Verificar crédito o stock gratis
    if (data.tipo_aviso === 'GRATIS') {
      const result = await this.freeStockService.useMonthlyFreeStock(data.empresa_id);

      if (!result.disponible) {
        throw new BadRequestException(result.mensaje);
      }
    } else {
      await this.StockService.useCredit(
        data.empresa_id,
        data.tipo_aviso as 'BASICO' | 'ESTANDAR' | 'PREMIUM'
      );
    }

    // 4️⃣ Calcular fechas
    const publicacion = data.fecha_publicacion ? new Date(data.fecha_publicacion) : new Date();
    const duracion = data.duracion_publicacion ?? 30;

    const fecha_cierre = data.fecha_cierre
      ? new Date(data.fecha_cierre)
      : new Date(publicacion.getTime() + duracion * 24 * 60 * 60 * 1000);

    // 5️⃣ Prioridad automática
    const prioridad = priorityMap[data.tipo_aviso];

    // 6️⃣ Crear oferta (GRATIS → pendiente de revisión)
    const esGratis = data.tipo_aviso === 'GRATIS';
    const nuevaOferta: Partial<Oferta> = {
      titulo: data.titulo,
      tipo_aviso: data.tipo_aviso,
      empresa,
      empleador,
      fecha_publicacion: publicacion,
      duracion_publicacion: duracion,
      fecha_cierre,
      es_activa: esGratis ? false : (data.es_activa ?? true),
      estado: esGratis ? 'pendiente_revision' : 'publicada',
      data: JSON.stringify(data.data),
      priority: prioridad,
    };

    const oferta = this.ofertaRepository.create(nuevaOferta);
    const saved = await this.ofertaRepository.save(oferta);

    console.log(
      `🧾 Oferta creada correctamente: ${saved.titulo} (Empresa ${empresa.id})` +
      (data.tipo_aviso === 'GRATIS'
        ? ' - Aviso GRATUITO (stock restado)'
        : ` - Crédito descontado (${data.tipo_aviso})`)
    );

    return saved;
  }




  // ======================================================
  // 📄 OBTENER OFERTA POR ID
  // ======================================================
  async obtenerOfertaPorId(id: number): Promise<Oferta> {
    const oferta = await this.ofertaRepository.findOne({
      where: { id },
      relations: ['empresa', 'empleador'],
    });
    if (!oferta)
      throw new NotFoundException(`Oferta con ID ${id} no encontrada`);
    return oferta;
  }

  // ======================================================
  // 📋 OBTENER OFERTAS POR EMPLEADOR
  // ======================================================
  // async obtenerOfertasPorEmpleador(
  //   empleadorId: number,
  //   pageOptions: PageOptionsDto
  // ): Promise<PageDto<Oferta>> {
  //   const qb = this.ofertaRepository.createQueryBuilder('oferta')
  //     .leftJoinAndSelect('oferta.empresa', 'empresa')
  //     .leftJoinAndSelect('oferta.empleador', 'empleador')
  //     .where('empleador.id = :empleadorId', { empleadorId })
  //     .skip(pageOptions.skip)
  //     .take(pageOptions.take);

  //   const [entities, itemCount] = await qb.getManyAndCount();
  //   const meta = new PageMetaDto({ pageOptionsDto: pageOptions, itemCount });
  //   return new PageDto(entities, meta);
  // }
  async obtenerOfertasPorEmpleador(
    empleadorId: number,
    pageOptions: PageOptionsDto,
    estado?: string,
  ): Promise<PageDto<Oferta>> {
    const qb = this.ofertaRepository.createQueryBuilder('oferta')
      .leftJoinAndSelect('oferta.empresa', 'empresa')
      .leftJoinAndSelect('oferta.empleador', 'empleador')
      .where('empleador.id = :empleadorId', { empleadorId })
      .orderBy('oferta.fecha_publicacion', Order.DESC)
      .skip(pageOptions.skip)
      .take(pageOptions.take);

    if (estado) {
      qb.andWhere('oferta.estado = :estado', { estado });
    }

    const [entities, itemCount] = await qb.getManyAndCount();

    const meta = new PageMetaDto({ pageOptionsDto: pageOptions, itemCount });

    return new PageDto(entities, meta);
  }


  // ======================================================
  // ❌ ELIMINAR OFERTA
  // ======================================================
  async eliminarOferta(id: number, usuarioId: number): Promise<{ message: string }> {
    const oferta = await this.ofertaRepository.findOne({
      where: { id },
      relations: ['empleador', 'empresa'],
    });
    if (!oferta)
      throw new NotFoundException(`Oferta con ID ${id} no encontrada`);

    const empleador = await this.empleadorRepository.findOne({
      where: { usuario: { id: usuarioId } },
      relations: ['usuario'],
    });
    if (!empleador)
      throw new NotFoundException(`Empleador con usuario ID ${usuarioId} no encontrado`);

    oferta.eliminada_por = empleador;
    await this.ofertaRepository.save(oferta);
    await this.ofertaRepository.softDelete(id);
    return { message: `Oferta con ID ${id} eliminada correctamente` };
  }

  // ======================================================
  // ✏️ ACTUALIZAR OFERTA
  // ======================================================
  async actualizarOferta(id: number, data: UpdateOfertaDto, userId: number): Promise<Oferta> {
    const oferta = await this.ofertaRepository.findOne({
      where: { id },
      relations: ['empleador'],
    });
    if (!oferta)
      throw new NotFoundException(`Oferta con ID ${id} no encontrada`);

    const empleador = await this.empleadorRepository.findOne({
      where: { usuario: { id: userId } },
      relations: ['usuario'],
    });
    if (!empleador)
      throw new NotFoundException(`Empleador con usuario_id ${userId} no encontrado`);

    if (oferta.empleador.id !== empleador.id)
      throw new ForbiddenException(`No tienes permisos para modificar esta oferta`);

    if (data.titulo !== undefined) oferta.titulo = data.titulo;
    if (data.data !== undefined) {
      data.data = typeof data.data === 'object' ? JSON.stringify(data.data) : data.data;
    }

    oferta.modificada_por = empleador;
    return this.ofertaRepository.save(oferta);
  }

  // 🏢 OBTENER OFERTAS POR EMPRESA
  // ======================================================
  async obtenerOfertasPorEmpresa(empresaId: number): Promise<Oferta[]> {
    const empresa = await this.empresaRepository.findOne({ where: { id: empresaId } });
    if (!empresa) {
      throw new NotFoundException(`Empresa con ID ${empresaId} no encontrada`);
    }

    const ofertas = await this.ofertaRepository.find({
      where: { empresa: { id: empresaId }, es_activa: true },
      relations: ['empresa', 'empleador'],
      order: { fecha_publicacion: 'DESC' },
    });

    if (!ofertas.length) {
      throw new NotFoundException(`No se encontraron ofertas activas para la empresa ${empresaId}`);
    }

    return ofertas;
  }

  async getJobsOffersPriority(pageOptionsDto: PageOptionsDto) {
    return this.jobOfferRepository.getJobsOffersPriority(pageOptionsDto);
  }

  // ======================================================
  // 🔒 CERRAR OFERTA MANUALMENTE
  // ======================================================
  async cerrarOferta(id: number, userId: number): Promise<Oferta> {
    const oferta = await this.ofertaRepository.findOne({
      where: { id },
      relations: ['empleador'],
    });
    if (!oferta)
      throw new NotFoundException(`Oferta con ID ${id} no encontrada`);

    const empleador = await this.empleadorRepository.findOne({
      where: { usuario: { id: userId } },
      relations: ['usuario'],
    });
    if (!empleador)
      throw new NotFoundException(`Empleador con usuario_id ${userId} no encontrado`);

    if (oferta.empleador.id !== empleador.id)
      throw new ForbiddenException('No tienes permisos para cerrar esta oferta');

    if (!oferta.es_activa)
      throw new BadRequestException('La oferta ya se encuentra cerrada');

    oferta.es_activa = false;
    oferta.estado = 'completada';
    oferta.fecha_cierre = new Date();
    oferta.modificada_por = empleador;

    return this.ofertaRepository.save(oferta);
  }

  // ======================================================
  // 📊 ESTADO DE OFERTA (resumen para frontend)
  // ======================================================
  async obtenerEstadoOferta(id: number) {
    const oferta = await this.ofertaRepository.findOne({
      where: { id },
      relations: ['empleador', 'empresa'],
    });
    if (!oferta)
      throw new NotFoundException(`Oferta con ID ${id} no encontrada`);

    const contratados = await this.procesoSeleccionRepository.count({
      where: {
        estado: 'contratado',
        postulacion: { oferta: { id } },
      },
      relations: { postulacion: { oferta: true } },
    });

    const fechaExpiracion = new Date(oferta.fecha_publicacion);
    fechaExpiracion.setDate(fechaExpiracion.getDate() + oferta.duracion_publicacion);

    let motivo_cierre: string | null = null;
    if (!oferta.es_activa) {
      if (oferta.estado === 'expirada') motivo_cierre = 'fecha_expiracion';
      else if (contratados >= oferta.numero_vacantes) motivo_cierre = 'vacantes_cubiertas';
      else motivo_cierre = 'cierre_manual';
    }

    return {
      id: oferta.id,
      titulo: oferta.titulo,
      estado: oferta.estado,
      es_activa: oferta.es_activa,
      motivo_cierre,
      numero_vacantes: oferta.numero_vacantes,
      vacantes_cubiertas: contratados,
      vacantes_disponibles: Math.max(0, oferta.numero_vacantes - contratados),
      fecha_publicacion: oferta.fecha_publicacion,
      fecha_expiracion: fechaExpiracion,
      fecha_cierre: oferta.fecha_cierre,
      dias_restantes: oferta.es_activa
        ? Math.max(0, Math.ceil((fechaExpiracion.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
        : 0,
    };
  }

  // ======================================================
  // 🔄 REACTIVAR OFERTA (republicar como nueva)
  // ======================================================
  async reactivarOferta(id: number, userId: number): Promise<Oferta> {
    const oferta = await this.ofertaRepository.findOne({
      where: { id },
      relations: ['empleador', 'empresa'],
    });
    if (!oferta)
      throw new NotFoundException(`Oferta con ID ${id} no encontrada`);

    const empleador = await this.empleadorRepository.findOne({
      where: { usuario: { id: userId } },
      relations: ['usuario'],
    });
    if (!empleador)
      throw new NotFoundException(`Empleador con usuario_id ${userId} no encontrado`);

    if (oferta.empleador.id !== empleador.id)
      throw new ForbiddenException('No tienes permisos para reactivar esta oferta');

    if (oferta.es_activa)
      throw new BadRequestException('La oferta ya se encuentra activa');

    const contratados = await this.procesoSeleccionRepository.count({
      where: {
        estado: 'contratado',
        postulacion: { oferta: { id } },
      },
      relations: { postulacion: { oferta: true } },
    });

    if (contratados >= oferta.numero_vacantes)
      throw new BadRequestException('No se puede reactivar: todas las vacantes están cubiertas.');

    // Descontar crédito según el tipo de aviso original
    if (oferta.tipo_aviso === 'GRATIS') {
      const result = await this.freeStockService.useMonthlyFreeStock(oferta.empresa.id);
      if (!result.disponible) {
        throw new BadRequestException(result.mensaje);
      }
    } else {
      await this.StockService.useCredit(
        oferta.empresa.id,
        oferta.tipo_aviso as 'BASICO' | 'ESTANDAR' | 'PREMIUM',
      );
    }

    // Republicar como nueva: resetear fechas y estado
    oferta.es_activa = true;
    oferta.estado = 'publicada';
    oferta.fecha_publicacion = new Date();
    (oferta as any).fecha_cierre = null;
    oferta.modificada_por = empleador;

    return this.ofertaRepository.save(oferta);
  }

}
