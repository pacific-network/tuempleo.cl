import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Oferta } from '../../repository/job_offer/job-offer.entity';

@Injectable()
export class SalaryStatsService {
  constructor(
    @InjectRepository(Oferta)
    private readonly ofertaRepository: Repository<Oferta>,
  ) {}

  async getSalaryStats(region?: string, categoria?: string) {
    const qb = this.ofertaRepository
      .createQueryBuilder('o')
      .select("JSON_UNQUOTE(JSON_EXTRACT(o.data, '$.region'))", 'region')
      .addSelect("JSON_UNQUOTE(JSON_EXTRACT(o.data, '$.categoria'))", 'categoria')
      .addSelect(
        "ROUND(AVG(JSON_EXTRACT(o.data, '$.renta_salarial.desde')), 0)",
        'promedio_desde',
      )
      .addSelect(
        "ROUND(AVG(JSON_EXTRACT(o.data, '$.renta_salarial.hasta')), 0)",
        'promedio_hasta',
      )
      .addSelect(
        "MIN(JSON_EXTRACT(o.data, '$.renta_salarial.desde'))",
        'min_salario',
      )
      .addSelect(
        "MAX(JSON_EXTRACT(o.data, '$.renta_salarial.hasta'))",
        'max_salario',
      )
      .addSelect('COUNT(*)', 'total_ofertas')
      .where('o.es_activa = :activa', { activa: true })
      .andWhere("o.estado = :estado", { estado: 'publicada' })
      .andWhere(
        "JSON_EXTRACT(o.data, '$.renta_salarial.desde') IS NOT NULL",
      )
      .andWhere(
        "(JSON_EXTRACT(o.data, '$.renta_salarial.de_acuerdo_al_mercado') IS NULL OR JSON_EXTRACT(o.data, '$.renta_salarial.de_acuerdo_al_mercado') = false)",
      );

    if (region) {
      qb.andWhere(
        "LOWER(JSON_UNQUOTE(JSON_EXTRACT(o.data, '$.region'))) LIKE :region",
        { region: `%${region.toLowerCase()}%` },
      );
    }

    if (categoria) {
      qb.andWhere(
        "LOWER(JSON_UNQUOTE(JSON_EXTRACT(o.data, '$.categoria'))) LIKE :cat",
        { cat: `%${categoria.toLowerCase()}%` },
      );
    }

    qb.groupBy("JSON_UNQUOTE(JSON_EXTRACT(o.data, '$.region'))").addGroupBy(
      "JSON_UNQUOTE(JSON_EXTRACT(o.data, '$.categoria'))",
    );

    const results = await qb.getRawMany();

    return results.map((r) => ({
      region: r.region || 'Sin especificar',
      categoria: r.categoria || 'Sin especificar',
      promedio_desde: Number(r.promedio_desde) || 0,
      promedio_hasta: Number(r.promedio_hasta) || 0,
      min_salario: Number(r.min_salario) || 0,
      max_salario: Number(r.max_salario) || 0,
      total_ofertas: Number(r.total_ofertas) || 0,
    }));
  }
}
