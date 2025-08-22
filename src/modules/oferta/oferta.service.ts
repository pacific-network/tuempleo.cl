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

@Injectable()
export class OfertaService {
  constructor(
    @InjectRepository(Oferta)
    private readonly ofertaRepository: Repository<Oferta>,
    @InjectRepository(Empleador)
    private readonly empleadorRepository: Repository<Empleador>,
    @InjectRepository(Empresa)
    private readonly empresaRepository: Repository<Empresa>,
  ) {}

  /**
   * Listado público con filtros/búsqueda/paginación.
   * Reglas:
   * - Filtros DUROS: región, comuna, posted, expiración.
   * - Categoría (area_trabajo):
   *    • si es el ÚNICO criterio → filtro duro
   *    • si hay otros criterios (q, modalidad, etc.) → booster (no filtra)
   * - Filtros SUAVES (booster): q/keyword, modalidad, expMin/expMax, salarioMin/Max, y bonus por recencia.
   *   Se ordena por rank_score DESC y luego por fecha (sortBy/order).
   */
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

    // Helper seguro para strings
    const s = (v: unknown) => (typeof v === 'string' ? v : '');

    const qb = this.ofertaRepository.createQueryBuilder("oferta")
      .leftJoinAndSelect("oferta.empresa", "empresa")
      .leftJoinAndSelect("oferta.empleador", "empleador")
      // .andWhere("oferta.es_activa = true")
      // .andWhere("oferta.fecha_eliminacion IS NULL")
      .skip(pageOptionsDto.skip)
      .take(pageOptionsDto.take);

    // --------------------- SCORE ACUMULADO ---------------------
    const scoreParts: string[] = [];

    // --------------------- BÚSQUEDA LIBRE (booster) ---------------------
    const rawSearch = s(q) || s(searchQuery) || undefined;
    const searchTerm = rawSearch ? rawSearch.trim().toLowerCase() : undefined;
    if (searchTerm) {
      const likeKw = `%${searchTerm}%`;
      scoreParts.push(`
        (CASE WHEN LOWER(oferta.titulo) LIKE :likeKw THEN 3 ELSE 0 END)
        +
        (CASE WHEN LOWER(JSON_UNQUOTE(JSON_EXTRACT(oferta.data,'$.descripcion_puesto'))) COLLATE utf8mb4_spanish2_ci LIKE :likeKw THEN 2 ELSE 0 END)
        +
        (CASE WHEN LOWER(JSON_UNQUOTE(JSON_EXTRACT(oferta.data,'$.responsabilidades')))  COLLATE utf8mb4_spanish2_ci LIKE :likeKw THEN 2 ELSE 0 END)
        +
        (CASE WHEN LOWER(JSON_UNQUOTE(JSON_EXTRACT(oferta.data,'$.requisitos_minimos'))) COLLATE utf8mb4_spanish2_ci LIKE :likeKw THEN 2 ELSE 0 END)
        +
        (CASE WHEN LOWER(JSON_UNQUOTE(JSON_EXTRACT(oferta.data,'$.requisitos')))        COLLATE utf8mb4_spanish2_ci LIKE :likeKw THEN 1 ELSE 0 END)
        +
        (CASE WHEN LOWER(JSON_UNQUOTE(JSON_EXTRACT(oferta.data,'$.funciones')))         COLLATE utf8mb4_spanish2_ci LIKE :likeKw THEN 1 ELSE 0 END)
        +
        (CASE WHEN LOWER(JSON_UNQUOTE(JSON_EXTRACT(oferta.data,'$.habilidades')))       COLLATE utf8mb4_spanish2_ci LIKE :likeKw THEN 1 ELSE 0 END)
        +
        (CASE WHEN LOWER(JSON_UNQUOTE(JSON_EXTRACT(oferta.data,'$.skills')))            COLLATE utf8mb4_spanish2_ci LIKE :likeKw THEN 1 ELSE 0 END)
        +
        (CASE WHEN LOWER(empresa.nombre_fantasia) LIKE :likeKw THEN 1 ELSE 0 END)
      `);
      qb.setParameter('likeKw', likeKw);
    }

    // --------------------- REGIÓN (duro) ---------------------
    const regionVal = s(region).trim();
    if (regionVal) {
      if (/^\d+$/.test(regionVal)) {
        qb.andWhere("JSON_UNQUOTE(JSON_EXTRACT(oferta.data, '$.region')) = :regCode", { regCode: regionVal });
      } else {
        qb.andWhere(`
          (
            LOWER(JSON_UNQUOTE(JSON_EXTRACT(empresa.data,   '$.region'))) COLLATE utf8mb4_spanish2_ci LIKE :likeRegion
            OR LOWER(JSON_UNQUOTE(JSON_EXTRACT(empleador.data,'$.region'))) COLLATE utf8mb4_spanish2_ci LIKE :likeRegion
            OR LOWER(JSON_UNQUOTE(JSON_EXTRACT(oferta.data, '$.region')))  COLLATE utf8mb4_spanish2_ci LIKE :likeRegion
          )`,
          { likeRegion: `%${regionVal.toLowerCase()}%` }
        );
      }
    }

    // --------------------- COMUNA (duro) ---------------------
    const comunaVal = s(comuna).trim().toLowerCase();
    if (comunaVal) {
      qb.andWhere(
        "LOWER(JSON_UNQUOTE(JSON_EXTRACT(oferta.data, '$.comuna'))) COLLATE utf8mb4_spanish2_ci LIKE :comuna",
        { comuna: `%${comunaVal}%` }
      );
    }

    // --------------------- CATEGORÍA / ÁREA ---------------------
    const catValRaw = (s(categoria) || s(area_trabajo)).trim();
    const catVal = catValRaw.toLowerCase();

    // ¿La categoría es el ÚNICO criterio? (entonces filtra)
    const onlyCategoria =
      !!catVal &&
      !searchTerm &&
      !regionVal &&
      !comunaVal &&
      !(Array.isArray(modalidad) && modalidad.filter(Boolean).length) &&
      !(Number.isFinite(Number(expMin)) || Number.isFinite(Number(expMax))) &&
      !(Number.isFinite(Number(salarioMin)) || Number.isFinite(Number(salarioMax))) &&
      !(s(posted).trim() && s(posted).trim() !== 'todos') &&
      !s(expiraAntes).trim() &&
      !s(expiraDespues).trim();

    if (catVal) {
      if (onlyCategoria) {
        // Filtro duro si es el único criterio
        qb.andWhere(
          "LOWER(JSON_UNQUOTE(JSON_EXTRACT(oferta.data, '$.area_trabajo'))) COLLATE utf8mb4_spanish2_ci LIKE :cat",
          { cat: `%${catVal}%` }
        );
      } else {
        // Booster si hay más criterios
        scoreParts.push(`
          (CASE WHEN LOWER(JSON_UNQUOTE(JSON_EXTRACT(oferta.data, '$.area_trabajo'))) COLLATE utf8mb4_spanish2_ci LIKE :cat THEN 3 ELSE 0 END)
        `);
        qb.setParameter('cat', `%${catVal}%`);
      }
    }

    // --------------------- MODALIDAD (booster) ---------------------
    if (Array.isArray(modalidad) && modalidad.filter(Boolean).length) {
      scoreParts.push(`
        (CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(oferta.data,'$.modalidad')) IN (:...mods) THEN 4 ELSE 0 END)
      `);
      qb.setParameter('mods', modalidad.filter(Boolean).map(String));
    } else {
      const modStr = s(modalidad as unknown as string).trim().toLowerCase();
      if (modStr) {
        scoreParts.push(`
          (CASE WHEN LOWER(JSON_UNQUOTE(JSON_EXTRACT(oferta.data,'$.modalidad'))) COLLATE utf8mb4_spanish2_ci LIKE :mod THEN 4 ELSE 0 END)
        `);
        qb.setParameter('mod', `%${modStr}%`);
      }
    }

    // --------------------- EXPERIENCIA (booster) ---------------------
    if (Number.isFinite(Number(expMin))) {
      scoreParts.push(`
        (CASE WHEN CAST(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(oferta.data,'$.anios_experiencia')), '') AS UNSIGNED) >= :emin THEN 1 ELSE 0 END)
      `);
      qb.setParameter('emin', Number(expMin));
    }
    if (Number.isFinite(Number(expMax))) {
      scoreParts.push(`
        (CASE WHEN CAST(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(oferta.data,'$.anios_experiencia')), '') AS UNSIGNED) <= :emax THEN 1 ELSE 0 END)
      `);
      qb.setParameter('emax', Number(expMax));
    }

    // --------------------- SALARIO (booster por intersección de rangos) ---------------------
    const desdeExpr = `
      CAST(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(oferta.data,'$.renta_salarial.desde')), '') AS UNSIGNED)
    `;
    const hastaExpr = `
      CAST(
        IFNULL(
          NULLIF(JSON_UNQUOTE(JSON_EXTRACT(oferta.data,'$.renta_salarial.hasta')), ''),
          JSON_UNQUOTE(JSON_EXTRACT(oferta.data,'$.renta_salarial.desde'))
        ) AS UNSIGNED
      )
    `;
    const hasMin = Number.isFinite(Number(salarioMin));
    const hasMax = Number.isFinite(Number(salarioMax));
    if (hasMin && hasMax) {
      scoreParts.push(`(CASE WHEN (${desdeExpr}) <= :smax AND (${hastaExpr}) >= :smin THEN 2 ELSE 0 END)`);
      qb.setParameter('smin', Number(salarioMin));
      qb.setParameter('smax', Number(salarioMax));
    } else if (hasMin) {
      scoreParts.push(`(CASE WHEN (${hastaExpr}) >= :smin THEN 1 ELSE 0 END)`);
      qb.setParameter('smin', Number(salarioMin));
    } else if (hasMax) {
      scoreParts.push(`(CASE WHEN (${desdeExpr}) <= :smax THEN 1 ELSE 0 END)`);
      qb.setParameter('smax', Number(salarioMax));
    }

    // --------------------- PUBLICADAS HACE… (duro + pequeño booster) ---------------------
    const postedRaw = s(posted).trim();
    const postedVal = postedRaw === 'recientes' ? '7d' : postedRaw;
    if (postedVal && postedVal !== 'todos') {
      const now = new Date();
      const from = new Date(now);
      if (postedVal === '24h') from.setDate(now.getDate() - 1);
      if (postedVal === '7d')  from.setDate(now.getDate() - 7);
      if (postedVal === '30d') from.setDate(now.getDate() - 30);
      if (postedVal === '60d') from.setDate(now.getDate() - 60);

      qb.andWhere('oferta.fecha_publicacion >= :from', { from });
      scoreParts.push(`(CASE WHEN oferta.fecha_publicacion >= :from THEN 1 ELSE 0 END)`);
    }

    // --------------------- EXPIRACIÓN (duro) ---------------------
    const expAntes = s(expiraAntes).trim();
    if (expAntes) qb.andWhere('oferta.fecha_cierre <= :ea', { ea: expAntes });
    const expDesp = s(expiraDespues).trim();
    if (expDesp) qb.andWhere('oferta.fecha_cierre >= :ed', { ed: expDesp });

    // --------------------- SCORE & ORDEN ---------------------
    const scoreExpr = scoreParts.length ? `(${scoreParts.join(' + ')})` : `0`;
    qb.addSelect(scoreExpr, 'rank_score');

    const by  = (sortBy === 'fecha_cierre' ? 'fecha_cierre' : 'fecha_publicacion');
    const dir = (order === 'ASC' ? 'ASC' : 'DESC') as ('ASC'|'DESC');

    qb.orderBy('rank_score', 'DESC')
      .addOrderBy(`oferta.${by}`, dir);

    // --------------------- EJECUCIÓN ---------------------
    const [entities, itemCount] = await qb.getManyAndCount();
    const meta = new PageMetaDto({ itemCount, pageOptionsDto });
    return new PageDto(entities, meta);
  }

  async crearOferta(data: CreateOfertaDto): Promise<Oferta> {
    const empleador = await this.empleadorRepository.findOne({ where: { id: data.empleador_id } });
    if (!empleador) throw new NotFoundException(`Empleador con ID ${data.empleador_id} no encontrado`);

    const empresa = await this.empresaRepository.findOne({ where: { id: data.empresa_id } });
    if (!empresa) throw new NotFoundException(`Empresa con ID ${data.empresa_id} no encontrada`);

    const oferta = this.ofertaRepository.create({ ...data, empresa, empleador });
    return this.ofertaRepository.save(oferta);
  }

  async obtenerOfertaPorId(id: number): Promise<Oferta> {
    const oferta = await this.ofertaRepository.findOne({ where: { id }, relations: ['empresa', 'empleador'] });
    if (!oferta) throw new NotFoundException(`Oferta con ID ${id} no encontrada`);
    return oferta;
  }

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

  async eliminarOferta(id: number, usuarioId: number): Promise<{ message: string }> {
    const oferta = await this.ofertaRepository.findOne({
      where: { id },
      relations: ['empleador', 'empresa'],
    });
    if (!oferta) throw new NotFoundException(`Oferta con ID ${id} no encontrada`);

    const empleador = await this.empleadorRepository.findOne({
      where: { usuario: { id: usuarioId } },
      relations: ['usuario'],
    });
    if (!empleador) throw new NotFoundException(`Empleador con usuario ID ${usuarioId} no encontrado`);

    oferta.eliminada_por = empleador;
    await this.ofertaRepository.save(oferta);
    await this.ofertaRepository.softDelete(id);
    return { message: `Oferta con ID ${id} eliminada correctamente` };
  }

  async actualizarOferta(id: number, data: UpdateOfertaDto, userId: number): Promise<Oferta> {
    const oferta = await this.ofertaRepository.findOne({
      where: { id },
      relations: ['empleador'],
    });
    if (!oferta) throw new NotFoundException(`Oferta con ID ${id} no encontrada`);

    const empleador = await this.empleadorRepository.findOne({
      where: { usuario: { id: userId } },
      relations: ['usuario'],
    });
    if (!empleador) throw new NotFoundException(`Empleador con usuario_id ${userId} no encontrado`);

    if (oferta.empleador.id !== empleador.id) {
      throw new ForbiddenException(`No tienes permisos para modificar esta oferta`);
    }

    if (data.titulo !== undefined) oferta.titulo = data.titulo;
    if (data.data !== undefined) {
      oferta.data = typeof data.data === 'object' ? JSON.stringify(data.data) : data.data;
    }

    oferta.modificada_por = empleador;
    return this.ofertaRepository.save(oferta);
  }
}
