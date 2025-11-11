import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Oferta } from "../../repository/job_offer/job-offer.entity";
import { Empleador } from "../../repository/employer/employer.entity";
import { Empresa } from "../../repository/business/business.entity";
import { CreateOfertaDto } from "./dto/create-oferta.dto";
import { PageOptionsDto } from "src/shared/pagination/page-options.dto";
import { PageDto } from "src/shared/pagination/page.dto";
import { PageMetaDto } from "src/shared/pagination/page-meta.dto";
import { UpdateOfertaDto } from "./dto/updadte-oferta.dto";
import { FilterOfertasDto } from "./dto/filter-ofertas.dto";
import { StockService } from "../stock/stock.service";

@Injectable()
export class OfertaService {
  constructor(
    @InjectRepository(Oferta)
    private readonly ofertaRepository: Repository<Oferta>,
    @InjectRepository(Empleador)
    private readonly empleadorRepository: Repository<Empleador>,
    @InjectRepository(Empresa)
    private readonly empresaRepository: Repository<Empresa>,
    private readonly StockService: StockService,
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
      .skip(pageOptionsDto.skip)
      .take(pageOptionsDto.take);

    const scoreParts: string[] = [];

    const rawSearch = s(q) || s(searchQuery) || undefined;
    const searchTerm = rawSearch ? rawSearch.trim().toLowerCase() : undefined;
    if (searchTerm) {
      const likeKw = `%${searchTerm}%`;
      scoreParts.push(`
        (CASE WHEN LOWER(oferta.titulo) LIKE :likeKw THEN 3 ELSE 0 END)
        +
        (CASE WHEN LOWER(JSON_UNQUOTE(JSON_EXTRACT(oferta.data,'$.descripcion_puesto'))) LIKE :likeKw THEN 2 ELSE 0 END)
      `);
      qb.setParameter('likeKw', likeKw);
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
    return new PageDto(entities, meta);
  }

  // ======================================================
  // 🟩 CREAR OFERTA
  // ======================================================
  async crearOferta(data: CreateOfertaDto): Promise<Oferta> {
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

    // 3️⃣ Verificar crédito si NO es GRATIS
    if (data.tipo_aviso !== 'GRATIS') {
      await this.StockService.useCredit(
        data.empresa_id,
        data.tipo_aviso as 'BASICO' | 'ESTANDAR' | 'PREMIUM'
      );
    }

    // 4️⃣ Calcular fechas seguras
    const publicacion = data.fecha_publicacion ? new Date(data.fecha_publicacion) : new Date();
    const duracion = data.duracion_publicacion ?? 30;

    const fecha_cierre = data.fecha_cierre
      ? new Date(data.fecha_cierre)
      : new Date(publicacion.getTime() + duracion * 24 * 60 * 60 * 1000);

    // 5️⃣ Crear la oferta
    const nuevaOferta: Partial<Oferta> = {
      titulo: data.titulo,
      tipo_aviso: data.tipo_aviso as any,
      empresa,
      empleador,
      fecha_publicacion: publicacion,
      duracion_publicacion: duracion,
      fecha_cierre,
      es_activa: data.es_activa ?? true,
      data: JSON.stringify(data.data), // 👈 CORREGIDO
    };

    const oferta = this.ofertaRepository.create(nuevaOferta);
    const saved = await this.ofertaRepository.save(oferta);

    console.log(
      `🧾 Oferta creada correctamente: ${saved.titulo} (Empresa ${empresa.id})` +
      (data.tipo_aviso === 'GRATIS'
        ? ' - Aviso gratuito (no descuenta stock)'
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
  async obtenerOfertasPorEmpleador(
    empleadorId: number,
    pageOptions: PageOptionsDto
  ): Promise<PageDto<Oferta>> {
    const qb = this.ofertaRepository.createQueryBuilder('oferta')
      .leftJoinAndSelect('oferta.empresa', 'empresa')
      .leftJoinAndSelect('oferta.empleador', 'empleador')
      .where('empleador.id = :empleadorId', { empleadorId })
      .skip(pageOptions.skip)
      .take(pageOptions.take);

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
}
